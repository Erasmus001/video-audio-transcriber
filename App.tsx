
import React, { useState, useRef, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import VideoPlayer from './components/VideoPlayer';
import TranscriptList from './components/TranscriptList';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import NotificationToast, { Notification } from './components/NotificationToast';
import { analyzeVideo, askVideoQuestion, generateExportContent } from './services/geminiService';
import { getCachedTranscript, cacheTranscript, saveProject, getAllProjects, deleteProjectFromDB } from './services/dbService';
import { VideoProject, ChatMessage, VideoAnalysisData } from './types';

function App() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // View state: 'landing' is the initial promo screen, 'dashboard' is the list of projects
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  
  // Chat state for the active project
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  
  // Refs for managing media playback and cancellation
  const mediaRef = useRef<HTMLMediaElement>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Derived state
  const activeProject = projects.find(p => p.id === activeProjectId);

  // Helper to generate ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Sound Player using Web Audio API (Soothing)
  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0.1, now); // Volume

      if (type === 'success') {
        // Major Chord Arpeggio (C5 - E5 - G5)
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          
          osc.connect(gain);
          gain.connect(masterGain);
          
          const start = now + (i * 0.1);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(1, start + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 1);
          
          osc.start(start);
          osc.stop(start + 1);
        });
      } else {
        // Gentle Low Error Tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Load projects from DB on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const savedProjects = await getAllProjects();
        
        // Hydrate projects: Create object URLs for blobs and handle interrupted status
        const hydratedProjects = savedProjects.map(p => {
          const updatedProject = { ...p };
          
          try {
             if (p.file && (p.file instanceof Blob || (p.file as any) instanceof File)) {
                updatedProject.previewUrl = URL.createObjectURL(p.file);
             }
          } catch (e) {
             console.error("Error hydrating project file:", e);
          }

          if (p.status === 'processing') {
            updatedProject.status = 'failed';
            updatedProject.error = 'Analysis interrupted by page reload';
            saveProject(updatedProject);
          }

          return updatedProject;
        });

        setProjects(hydratedProjects);
        
        if (hydratedProjects.length > 0) {
          setView('dashboard');
        }
      } catch (err) {
        console.error("Failed to load projects from DB", err);
      } finally {
        setIsLoadingDB(false);
      }
    };

    loadProjects();
  }, []);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      projects.forEach(p => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, []);

  const getMediaDuration = (fileOrBlob: File | Blob, type: 'video' | 'audio'): Promise<number> => {
    return new Promise((resolve) => {
      const element = document.createElement(type);
      element.preload = 'metadata';
      element.onloadedmetadata = () => {
        window.URL.revokeObjectURL(element.src);
        resolve(element.duration);
      };
      element.onerror = () => {
        resolve(0);
      };
      element.src = URL.createObjectURL(fileOrBlob);
    });
  };

  const readFileAsBase64 = (file: Blob, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = (event.loaded / event.total) * 100;
          onProgress(percent);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const startAnalysis = async (project: VideoProject) => {
    saveProject(project);

    const controller = new AbortController();
    abortControllers.current.set(project.id, controller);
    
    const startTime = Date.now();
    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
       // 1. Check Cache First
       if (project.duration && project.duration > 0) {
         const cached = await getCachedTranscript(project.fileName, project.fileSize, project.duration);
         if (cached) {
            console.log("Cache hit for", project.fileName);
            const completedProject = { 
                ...project, 
                status: 'completed' as const, 
                data: cached.data,
                processingTime: 0,
                progress: 100,
                chatHistory: project.chatHistory || []
            };
            
            setProjects(prev => prev.map(p => p.id === project.id ? completedProject : p));
            saveProject(completedProject);
            playSound('success');
            addNotification('success', `"${project.fileName}" restored from cache.`);
            return;
         }
       }

       // 2. Read File
       const base64Data = await readFileAsBase64(project.file, (readPercent) => {
          setProjects(prev => prev.map(p => 
            p.id === project.id ? { ...p, progress: Math.round(readPercent * 0.3) } : p
          ));
       });

       // 3. Process/Analyze
       setProjects(prev => prev.map(p => 
         p.id === project.id ? { ...p, progress: 30 } : p
       ));

       progressInterval = setInterval(() => {
         setProjects(prev => prev.map(p => {
           if (p.id === project.id && p.status === 'processing') {
             const current = p.progress || 30;
             let step = 1;
             if (current > 60) step = 0.5;
             if (current > 80) step = 0.2;
             if (current > 90) step = 0.05;
             
             const next = Math.min(current + step, 95);
             return { ...p, progress: next };
           }
           return p;
         }));
       }, 500);
       
       const result = await analyzeVideo(base64Data, project.mimeType, controller.signal);
       
       if (progressInterval) clearInterval(progressInterval);

       const endTime = Date.now();
       
       // 4. Save to Cache
       if (project.duration) {
         await cacheTranscript(project.fileName, project.fileSize, project.duration, result);
       }

       const completedProject = { 
           ...project, 
           status: 'completed' as const, 
           data: result,
           processingTime: endTime - startTime,
           progress: 100,
           chatHistory: [] // Initialize chat history
       };

       setProjects(prev => prev.map(p => p.id === project.id ? completedProject : p));
       saveProject(completedProject);
       
       playSound('success');
       addNotification('success', `"${project.fileName}" transcription completed successfully.`);

    } catch (error: any) {
        if (progressInterval) clearInterval(progressInterval);
        
        if (error.name === 'AbortError' || error.message === 'Aborted') {
           setProjects(prev => {
               const updated = prev.map(p => p.id === project.id ? { ...p, status: 'cancelled' as const, progress: 0 } : p);
               const cancelledProject = updated.find(p => p.id === project.id);
               if (cancelledProject) saveProject(cancelledProject);
               return updated;
           });
           addNotification('error', `Transcription for "${project.fileName}" cancelled.`);
        } else {
           console.error("Analysis failed", error);
           setProjects(prev => {
               const updated = prev.map(p => p.id === project.id ? { ...p, status: 'failed' as const, error: error.message, progress: 0 } : p);
               const failedProject = updated.find(p => p.id === project.id);
               if (failedProject) saveProject(failedProject);
               return updated;
           });
           playSound('error');
           addNotification('error', `Failed to transcribe "${project.fileName}". ${error.message}`);
        }
    } finally {
        abortControllers.current.delete(project.id);
    }
  };

  const handleFileSelect = async (file: File) => {
    const type = file.type.startsWith('audio/') ? 'audio' : 'video';
    const duration = await getMediaDuration(file, type);
    
    const newProject: VideoProject = {
      id: generateId(),
      file: file,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      mediaType: type,
      status: 'processing',
      createdAt: Date.now(),
      previewUrl: URL.createObjectURL(file),
      duration: duration,
      progress: 0,
      chatHistory: []
    };

    setProjects(prev => [newProject, ...prev]);
    setShowUpload(false);
    setView('dashboard');
    startAnalysis(newProject);
  };

  const handleUrlSelect = async (url: string) => {
    setIsUrlLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file from URL");
      const blob = await response.blob();
      const type = blob.type.startsWith('audio/') ? 'audio' : 'video';
      const fileName = url.split('/').pop() || `downloaded_${type}`;
      const duration = await getMediaDuration(blob, type);

      const newProject: VideoProject = {
        id: generateId(),
        file: blob,
        fileName: fileName,
        fileSize: blob.size,
        mimeType: blob.type || (type === 'audio' ? 'audio/mp3' : 'video/mp4'),
        mediaType: type,
        status: 'processing',
        createdAt: Date.now(),
        previewUrl: URL.createObjectURL(blob),
        duration: duration,
        sourceUrl: url,
        progress: 0,
        chatHistory: []
      };

      setProjects(prev => [newProject, ...prev]);
      setShowUpload(false);
      setView('dashboard');
      startAnalysis(newProject);
    } catch (err) {
      alert("Could not fetch media from URL. It may be blocked by CORS. Try downloading it first.");
    } finally {
      setIsUrlLoading(false);
    }
  };

  const handleRetry = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, status: 'processing', error: undefined, processingTime: undefined, progress: 0 } : p
    ));
    startAnalysis(project);
  };

  const handleStop = (id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(id);
    }
    setProjects(prev => {
        const updated = prev.map(p => p.id === id ? { ...p, status: 'cancelled' as const, progress: 0 } : p);
        const stoppedProject = updated.find(p => p.id === id);
        if (stoppedProject) saveProject(stoppedProject);
        return updated;
    });
  };

  const handleDelete = (id: string) => {
    handleStop(id);
    const project = projects.find(p => p.id === id);
    if (project?.previewUrl) {
      URL.revokeObjectURL(project.previewUrl);
    }
    deleteProjectFromDB(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(null);
      setChatMessages([]);
      setCurrentTime(0);
    }
  };

  const handleSeek = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, seconds);
      mediaRef.current.play();
    }
  };
  
  const handleViewProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    setActiveProjectId(id);
    setCurrentTime(0);
    setChatMessages(project?.chatHistory || []);
  };

  const handleChatMessage = async (text: string) => {
    if (!activeProject) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const updatedHistory = [...chatMessages, userMsg];
    
    // Update local state immediately for responsiveness
    setChatMessages(updatedHistory);
    setIsChatLoading(true);

    try {
      const base64 = await readFileAsBase64(activeProject.file);
      const response = await askVideoQuestion(base64, activeProject.mimeType, text, updatedHistory);
      const modelMsg: ChatMessage = { role: 'model', text: response };
      const finalHistory = [...updatedHistory, modelMsg];
      
      setChatMessages(finalHistory);

      // Persist the history to the project object and DB
      setProjects(prev => {
        const updated = prev.map(p => {
          if (p.id === activeProject.id) {
            const updatedProject = { ...p, chatHistory: finalHistory };
            saveProject(updatedProject); // Save updated project to DB
            return updatedProject;
          }
          return p;
        });
        return updated;
      });

    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = { role: 'model', text: "Sorry, I encountered an error answering that." };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Fixed handleDownloadMediaWithCaptions to use correct srtBlob name
  const handleDownloadMediaWithCaptions = () => {
    if (!activeProject || !activeProject.data) return;
    const a = document.createElement('a');
    a.href = activeProject.previewUrl || '';
    a.download = activeProject.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    const srtContent = generateExportContent(activeProject.data.transcript, 'srt');
    const srtBlob = new Blob([srtContent], { type: 'text/plain' });
    const srtUrl = URL.createObjectURL(srtBlob);
    const srtLink = document.createElement('a');
    srtLink.href = srtUrl;
    const srtName = activeProject.fileName.substring(0, activeProject.fileName.lastIndexOf('.')) + '.srt';
    srtLink.download = srtName;
    document.body.appendChild(srtLink);
    srtLink.click();
    document.body.removeChild(srtLink);
    URL.revokeObjectURL(srtUrl);
  };

  const navigateToDashboard = () => {
    setActiveProjectId(null);
    setShowUpload(false);
    setView('dashboard');
    setChatMessages([]);
    setCurrentTime(0);
  };

  const navigateToLanding = () => {
    setActiveProjectId(null);
    setShowUpload(false);
    setView('landing');
    setChatMessages([]);
  };

  if (isLoadingDB) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative">
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
             className="flex items-center gap-2 cursor-pointer" 
             onClick={navigateToLanding}
          >
            <div className="bg-brand-500 text-white p-1.5 rounded-lg">
              <span className="material-icons-round text-2xl">video_library</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">VideoScripter</h1>
          </div>
          
          <div className="flex items-center gap-4">
             {activeProjectId ? (
                <button 
                  onClick={navigateToDashboard}
                  className="text-sm font-medium text-gray-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
                >
                  <span className="material-icons-round text-lg">arrow_back</span>
                  Back to Dashboard
                </button>
             ) : (
                <button 
                  onClick={navigateToDashboard}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1
                     ${view === 'dashboard' && !showUpload ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <span className="material-icons-round text-lg">dashboard</span>
                  Dashboard
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {!activeProjectId && !showUpload && view === 'landing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
             <div className="text-center max-w-2xl mb-8">
               <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
                 Audio & Video Intelligence
               </h2>
               <p className="text-lg text-gray-500">
                 Upload a video or audio file to generate transcripts, summaries, and insights powered by Gemini.
               </p>
               <div className="mt-4 flex justify-center gap-4">
                  <button 
                     onClick={navigateToDashboard}
                     className="text-sm font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1"
                  >
                     Go to Dashboard <span className="material-icons-round text-base">arrow_forward</span>
                  </button>
               </div>
             </div>
             <div className="mt-10 w-full flex justify-center">
                <FileUpload onFileSelect={handleFileSelect} onUrlSelect={handleUrlSelect} isLoading={isUrlLoading} />
             </div>
          </div>
        )}

        {!activeProjectId && view === 'dashboard' && (
          <>
            <Dashboard 
              projects={projects}
              onView={handleViewProject}
              onDelete={handleDelete}
              onRetry={handleRetry}
              onStop={handleStop}
              onNewUpload={() => setShowUpload(true)}
            />
            
            {showUpload && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">Add Media</h2>
                    <button 
                      onClick={() => setShowUpload(false)}
                      className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                    >
                      <span className="material-icons-round">close</span>
                    </button>
                  </div>
                  <div className="p-6">
                    <FileUpload 
                      onFileSelect={handleFileSelect} 
                      onUrlSelect={handleUrlSelect} 
                      isLoading={isUrlLoading} 
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeProjectId && activeProject && activeProject.status === 'completed' && activeProject.data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-black rounded-2xl shadow-xl overflow-hidden ring-1 ring-gray-900/5">
                <VideoPlayer 
                   src={activeProject.previewUrl || ''} 
                   type={activeProject.mediaType}
                   ref={mediaRef}
                   onTimeUpdate={setCurrentTime}
                   chapters={activeProject.data.chapters}
                   onSeek={handleSeek}
                   currentTime={currentTime}
                />
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2">
                 <button 
                   onClick={handleDownloadMediaWithCaptions}
                   className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
                 >
                    <span className="material-icons-round text-brand-600">movie</span>
                    Download {activeProject.mediaType === 'video' ? 'Video' : 'Audio'} + Captions
                 </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-icons-round text-brand-500">summarize</span>
                  <h3 className="text-lg font-bold text-gray-900">Summary</h3>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {activeProject.data.summary}
                </p>
                
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Key Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeProject.data.topics.map((topic, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

               <ChatInterface 
                messages={chatMessages}
                onSendMessage={handleChatMessage}
                isLoading={isChatLoading}
              />
            </div>

            <div className="lg:col-span-5 h-[calc(100vh-8rem)] sticky top-24">
               <TranscriptList 
                 transcript={activeProject.data.transcript} 
                 chapters={activeProject.data.chapters}
                 onSeek={handleSeek}
                 currentTime={currentTime}
               />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
