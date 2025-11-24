import React, { useState, useRef, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import VideoPlayer from './components/VideoPlayer';
import TranscriptList from './components/TranscriptList';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import { analyzeVideo, askVideoQuestion, generateExportContent } from './services/geminiService';
import { getCachedTranscript, cacheTranscript, saveProject, getAllProjects, deleteProjectFromDB } from './services/dbService';
import { VideoProject, ChatMessage, VideoAnalysisData } from './types';

function App() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  
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

  // Load projects from DB on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const savedProjects = await getAllProjects();
        
        // Hydrate projects: Create object URLs for blobs and handle interrupted status
        const hydratedProjects = savedProjects.map(p => {
          const updatedProject = { ...p };
          
          // Re-create preview URL from stored Blob/File
          if ((p.file as any) instanceof Blob) {
             updatedProject.previewUrl = URL.createObjectURL(p.file);
          }

          // If status was processing when saved (app closed during process), mark as failed/interrupted
          if (p.status === 'processing') {
            updatedProject.status = 'failed';
            updatedProject.error = 'Analysis interrupted by page reload';
            saveProject(updatedProject);
          }

          return updatedProject;
        });

        setProjects(hydratedProjects);
        
        // If we have projects, go straight to dashboard
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

  // Clean up object URLs when projects are deleted or app unmounts
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

  const startAnalysis = async (project: VideoProject) => {
    // Update DB status to processing
    saveProject(project);

    // Create abort controller for this job
    const controller = new AbortController();
    abortControllers.current.set(project.id, controller);
    
    const startTime = Date.now();

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
                processingTime: 0 // Instant
            };
            
            setProjects(prev => prev.map(p => p.id === project.id ? completedProject : p));
            saveProject(completedProject);
            return;
         }
       }

       // 2. Process if no cache
       const base64Data = await readFileAsBase64(project.file);
       
       const result = await analyzeVideo(base64Data, project.mimeType, controller.signal);
       const endTime = Date.now();
       
       // 3. Save to Cache
       if (project.duration) {
         await cacheTranscript(project.fileName, project.fileSize, project.duration, result);
       }

       const completedProject = { 
           ...project, 
           status: 'completed' as const, 
           data: result,
           processingTime: endTime - startTime
       };

       setProjects(prev => prev.map(p => p.id === project.id ? completedProject : p));
       saveProject(completedProject);

    } catch (error: any) {
        if (error.name === 'AbortError' || error.message === 'Aborted') {
           setProjects(prev => {
               const updated = prev.map(p => p.id === project.id ? { ...p, status: 'cancelled' as const } : p);
               const cancelledProject = updated.find(p => p.id === project.id);
               if (cancelledProject) saveProject(cancelledProject);
               return updated;
           });
        } else {
           console.error("Analysis failed", error);
           setProjects(prev => {
               const updated = prev.map(p => p.id === project.id ? { ...p, status: 'failed' as const, error: error.message } : p);
               const failedProject = updated.find(p => p.id === project.id);
               if (failedProject) saveProject(failedProject);
               return updated;
           });
        }
    } finally {
        abortControllers.current.delete(project.id);
    }
  };

  const readFileAsBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
      duration: duration
    };

    setProjects(prev => [newProject, ...prev]);
    setShowUpload(false);
    setView('dashboard'); // Switch to dashboard view
    
    // Start processing in background
    startAnalysis(newProject);
  };

  const handleUrlSelect = async (url: string) => {
    setIsUrlLoading(true);
    try {
      // Try to fetch the blob
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file from URL");
      const blob = await response.blob();
      
      // Determine type from blob or url extension
      const type = blob.type.startsWith('audio/') ? 'audio' : 'video';
      // Use URL end as filename or default
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
        sourceUrl: url
      };

      setProjects(prev => [newProject, ...prev]);
      setShowUpload(false);
      setView('dashboard'); // Switch to dashboard view
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
      p.id === id ? { ...p, status: 'processing', error: undefined, processingTime: undefined } : p
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
        const updated = prev.map(p => p.id === id ? { ...p, status: 'cancelled' as const } : p);
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
      mediaRef.current.currentTime = seconds;
      mediaRef.current.play();
    }
  };
  
  const handleViewProject = (id: string) => {
    setActiveProjectId(id);
    setCurrentTime(0); // Reset time when viewing new project
  };

  const handleChatMessage = async (text: string) => {
    if (!activeProject) return;

    const newMsg: ChatMessage = { role: 'user', text };
    const updatedHistory = [...chatMessages, newMsg];
    setChatMessages(updatedHistory);
    setIsChatLoading(true);

    try {
      const base64 = await readFileAsBase64(activeProject.file);
      const response = await askVideoQuestion(base64, activeProject.mimeType, text, updatedHistory);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error answering that." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDownloadMediaWithCaptions = () => {
    if (!activeProject || !activeProject.data) return;

    // 1. Trigger Media Download
    const a = document.createElement('a');
    a.href = activeProject.previewUrl || '';
    a.download = activeProject.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 2. Trigger Caption Download (SRT)
    const srtContent = generateExportContent(activeProject.data.transcript, 'srt');
    const srtBlob = new Blob([srtContent], { type: 'text/plain' });
    const srtUrl = URL.createObjectURL(srtBlob);
    const srtLink = document.createElement('a');
    srtLink.href = srtUrl;
    // Name it same as video but .srt
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
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
             {/* Navigation Links */}
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* State 1: Landing / Empty State */}
        {!activeProjectId && !showUpload && view === 'landing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
             <div className="text-center max-w-2xl mb-8">
               <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
                 Audio & Video Intelligence
               </h2>
               <p className="text-lg text-gray-500">
                 Upload a video or audio file to generate transcripts, summaries, and insights powered by Gemini.
               </p>
               
               {/* Link to Dashboard for landing page */}
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

        {/* State 3: Dashboard */}
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
            
            {/* Modal for Upload */}
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

        {/* State 4: Project Detail View */}
        {activeProjectId && activeProject && activeProject.status === 'completed' && activeProject.data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
            {/* Left Column: Media & Chat */}
            <div className="lg:col-span-7 space-y-6">
              {/* Media Player */}
              <div className="bg-black rounded-2xl shadow-xl overflow-hidden ring-1 ring-gray-900/5">
                <VideoPlayer 
                   src={activeProject.previewUrl || ''} 
                   type={activeProject.mediaType}
                   ref={mediaRef}
                   onTimeUpdate={setCurrentTime}
                />
              </div>

              {/* Actions Bar */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                 <button 
                   onClick={handleDownloadMediaWithCaptions}
                   className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
                 >
                    <span className="material-icons-round text-brand-600">movie</span>
                    Download {activeProject.mediaType === 'video' ? 'Video' : 'Audio'} + Captions
                 </button>
              </div>

              {/* Summary Card */}
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

               {/* Chat Interface */}
               <ChatInterface 
                messages={chatMessages}
                onSendMessage={handleChatMessage}
                isLoading={isChatLoading}
              />
            </div>

            {/* Right Column: Transcript */}
            <div className="lg:col-span-5 h-[calc(100vh-8rem)] sticky top-24">
               <TranscriptList 
                 transcript={activeProject.data.transcript} 
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