
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import TranscriptsView from './components/TranscriptsView';
import ProjectDetailView from './components/ProjectDetailView';
import NotificationToast, { Notification } from './components/NotificationToast';
import { analyzeVideo, askVideoQuestion } from './services/geminiService';
import { getCachedTranscript, cacheTranscript, saveProject, getAllProjects, deleteProjectFromDB } from './services/dbService';
import { VideoProject, ChatMessage } from './types';

export type NavTab = 'dashboard' | 'transcripts' | 'files' | 'settings';

function App() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // UI state for active session
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Derived state: the current project is found directly from the projects array
  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId), 
    [projects, activeProjectId]
  );

  const stats = useMemo(() => {
    const totalSize = projects.reduce((acc, p) => acc + p.fileSize, 0);
    const totalSeconds = projects.reduce((acc, p) => acc + (p.duration || 0), 0);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    return {
      count: projects.length,
      hours: hrs,
      minutes: mins,
      sizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(1)
    };
  }, [projects]);

  // Load projects from DB on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const savedProjects = await getAllProjects();
        const hydratedProjects = savedProjects.map(p => {
          const updatedProject = { ...p };
          if (p.file && (p.file instanceof Blob || (p.file as any) instanceof File)) {
            updatedProject.previewUrl = URL.createObjectURL(p.file);
          }
          // Reset interrupted processing status
          if (p.status === 'processing') {
            updatedProject.status = 'failed';
            updatedProject.error = 'Analysis interrupted';
            saveProject(updatedProject);
          }
          return updatedProject;
        });
        setProjects(hydratedProjects);
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setIsLoadingDB(false);
      }
    };
    loadProjects();
  }, []);

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const startAnalysis = async (project: VideoProject) => {
    const controller = new AbortController();
    abortControllers.current.set(project.id, controller);
    
    try {
      if (project.duration) {
        const cached = await getCachedTranscript(project.fileName, project.fileSize, project.duration);
        if (cached) {
          const completed = { ...project, status: 'completed' as const, data: cached.data, progress: 100 };
          setProjects(prev => prev.map(p => p.id === project.id ? completed : p));
          saveProject(completed);
          addNotification('success', `"${project.fileName}" restored from cache.`);
          return;
        }
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(project.file);
      });

      const base64Data = await base64Promise;
      const result = await analyzeVideo(base64Data, project.mimeType, controller.signal);
      
      if (project.duration) await cacheTranscript(project.fileName, project.fileSize, project.duration, result);

      const completed = { ...project, status: 'completed' as const, data: result, progress: 100, chatHistory: [] };
      setProjects(prev => prev.map(p => p.id === project.id ? completed : p));
      saveProject(completed);
      addNotification('success', `"${project.fileName}" transcription complete.`);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const failed = { ...project, status: 'failed' as const, error: error.message };
        setProjects(prev => prev.map(p => p.id === project.id ? failed : p));
        saveProject(failed);
        addNotification('error', `Failed to transcribe "${project.fileName}".`);
      }
    }
  };

  const handleFileSelect = async (file: File) => {
    const type = file.type.startsWith('audio/') ? 'audio' : 'video';
    const newProject: VideoProject = {
      id: Math.random().toString(36).substring(2, 9),
      file,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      mediaType: type,
      status: 'processing',
      createdAt: Date.now(),
      previewUrl: URL.createObjectURL(file),
      progress: 10,
      chatHistory: []
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveTab('dashboard');
    startAnalysis(newProject);
  };

  const handleChatMessage = async (text: string) => {
    if (!activeProject) return;
    
    const userMsg: ChatMessage = { role: 'user', text };
    const currentHistory = activeProject.chatHistory || [];
    const updatedHistory = [...currentHistory, userMsg];

    // Optimistically update the UI and projects list
    setProjects(prev => prev.map(p => 
      p.id === activeProject.id ? { ...p, chatHistory: updatedHistory } : p
    ));
    
    setIsChatLoading(true);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res) => {
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.readAsDataURL(activeProject.file);
      });
      
      const response = await askVideoQuestion(base64, activeProject.mimeType, text, updatedHistory);
      const modelMsg: ChatMessage = { role: 'model', text: response };
      const finalHistory = [...updatedHistory, modelMsg];
      
      // Update state with model response
      setProjects(prev => prev.map(p => 
        p.id === activeProject.id ? { ...p, chatHistory: finalHistory } : p
      ));
      
      // Persist the entire updated history to IndexedDB
      await saveProject({ ...activeProject, chatHistory: finalHistory });
    } catch (err) {
      const errorMsg: ChatMessage = { role: 'model', text: "Sorry, I encountered an error processing your request." };
      setProjects(prev => prev.map(p => 
        p.id === activeProject.id ? { ...p, chatHistory: [...updatedHistory, errorMsg] } : p
      ));
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project?.previewUrl) URL.revokeObjectURL(project.previewUrl);
    deleteProjectFromDB(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
  };

  if (isLoadingDB) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <NotificationToast notifications={notifications} onDismiss={(id) => setNotifications(n => n.filter(x => x.id !== id))} />
      
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => { setActiveTab(tab); setActiveProjectId(null); }} 
      />

      <main className="flex-1 overflow-y-auto bg-gray-50/50">
        <div className="p-8 max-w-[1600px] mx-auto">
          {activeProjectId && activeProject ? (
            <ProjectDetailView 
              project={activeProject}
              onBack={() => setActiveProjectId(null)}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              onSendMessage={handleChatMessage}
              isChatLoading={isChatLoading}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView 
                  stats={stats}
                  recentProjects={projects.slice(0, 7)}
                  onView={(id) => setActiveProjectId(id)}
                  onDelete={handleDelete}
                  onFileSelect={handleFileSelect}
                />
              )}
              {activeTab === 'transcripts' && (
                <TranscriptsView 
                  projects={projects}
                  onView={(id) => setActiveProjectId(id)}
                  onDelete={handleDelete}
                  onFileSelect={handleFileSelect}
                />
              )}
              {activeTab === 'files' && (
                <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
                  <span className="material-icons-round text-6xl mb-4">folder</span>
                  <p className="text-xl font-medium">File Management System</p>
                  <p className="text-sm">Manage source files and processed documents here.</p>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="max-w-2xl bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h2 className="text-2xl font-bold mb-6">Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium">Export Format</p>
                        <p className="text-xs text-gray-500">Default format for transcript downloads</p>
                      </div>
                      <select className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm">
                        <option>SRT (Subtitles)</option>
                        <option>TXT (Plain Text)</option>
                        <option>JSON</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
