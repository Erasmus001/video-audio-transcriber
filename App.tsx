
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import TranscriptsView from './components/TranscriptsView';
import ProjectDetailView from './components/ProjectDetailView';
import FilesView from './components/FilesView';
import SettingsView from './components/SettingsView';
import NotificationToast, { Notification } from './components/NotificationToast';
import { analyzeVideo, askVideoQuestion } from './services/geminiService';
import { saveProject, getAllProjects, deleteProjectFromDB } from './services/dbService';
import { VideoProject, ChatMessage } from './types';

export type NavTab = 'dashboard' | 'transcripts' | 'files' | 'settings';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function App() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId), 
    [projects, activeProjectId]
  );

  const stats = useMemo(() => {
    const totalSize = projects.reduce((acc, p) => acc + p.fileSize, 0);
    const totalSeconds = projects.reduce((acc, p) => acc + (p.duration || 0), 0);
    const processingCount = projects.filter(p => p.status === 'processing' || p.status === 'queued').length;
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    return {
      count: projects.length,
      hours: hrs,
      minutes: mins,
      sizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
      active: processingCount
    };
  }, [projects]);

  // Centralized save/update function to ensure persistence
  const updateProjectState = useCallback((id: string, updates: Partial<VideoProject>) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const updatedProject = next.find(p => p.id === id);
      if (updatedProject) {
        saveProject(updatedProject); // Persist to IndexedDB
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const savedProjects = await getAllProjects();
        const hydratedProjects = savedProjects.map(p => {
          const updatedProject = { ...p };
          if (p.file) {
            updatedProject.previewUrl = URL.createObjectURL(p.file);
          }
          // If app closed during processing, mark as failed for user visibility
          if (p.status === 'processing' || p.status === 'queued') {
            updatedProject.status = 'failed';
            updatedProject.error = 'Session interrupted';
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

  const getMediaDuration = (file: File | Blob): Promise<number> => {
    return new Promise((resolve) => {
      const element = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
      const url = URL.createObjectURL(file);
      element.src = url;
      element.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(element.duration);
      };
      element.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });
  };

  const startAnalysis = async (project: VideoProject) => {
    const controller = new AbortController();
    abortControllers.current.set(project.id, controller);
    const startTime = Date.now();

    try {
      updateProjectState(project.id, { progress: 20 });
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(project.file);
      });
      const base64Data = await base64Promise;
      
      updateProjectState(project.id, { progress: 45 });
      
      const result = await analyzeVideo(base64Data, project.mimeType, controller.signal);
      
      updateProjectState(project.id, { progress: 90 });
      
      const completedUpdates: Partial<VideoProject> = { 
        status: 'completed', 
        data: result, // This object contains summary, topics, chapters, and transcript
        progress: 100, 
        processingTime: Date.now() - startTime,
        chatHistory: [] 
      };
      
      updateProjectState(project.id, completedUpdates);
      addNotification('success', `"${project.fileName}" analysis complete.`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateProjectState(project.id, { status: 'failed', error: 'Transcription cancelled', progress: 0 });
        addNotification('error', `Cancelled: ${project.fileName}`);
      } else {
        updateProjectState(project.id, { status: 'failed', error: error.message, progress: 0 });
        addNotification('error', `Failed: ${project.fileName}`);
      }
    } finally {
      abortControllers.current.delete(project.id);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      addNotification('error', `File too large (Max 50MB). This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }

    const duration = await getMediaDuration(file);
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
      progress: 5,
      chatHistory: [],
      duration
    };
    
    setProjects(prev => [newProject, ...prev]);
    saveProject(newProject);
    setActiveTab('dashboard');
    startAnalysis(newProject);
  };

  const handleRetry = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    updateProjectState(id, { status: 'processing', progress: 5, error: undefined });
    startAnalysis({ ...project, status: 'processing' });
  };

  const handleCancel = (id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
    }
  };

  const handleChatMessage = async (text: string) => {
    if (!activeProject) return;
    const userMsg: ChatMessage = { role: 'user', text };
    const updatedHistory = [...(activeProject.chatHistory || []), userMsg];

    updateProjectState(activeProject.id, { chatHistory: updatedHistory });
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
      
      updateProjectState(activeProject.id, { chatHistory: finalHistory });
    } catch (err) {
      addNotification('error', "Chat failed to connect.");
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

  const handleClearAll = async () => {
    for (const p of projects) {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      await deleteProjectFromDB(p.id);
    }
    setProjects([]);
    addNotification('success', "Library cleared successfully.");
  };

  if (isLoadingDB) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <NotificationToast notifications={notifications} onDismiss={(id) => setNotifications(n => n.filter(x => x.id !== id))} />
      <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setActiveProjectId(null); }} />

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
                  recentProjects={projects.slice(0, 10)}
                  onView={(id) => setActiveProjectId(id)}
                  onDelete={handleDelete}
                  onFileSelect={handleFileSelect}
                  onRetry={handleRetry}
                  onCancel={handleCancel}
                />
              )}
              {activeTab === 'transcripts' && (
                <TranscriptsView 
                  projects={projects}
                  onView={(id) => setActiveProjectId(id)}
                  onDelete={handleDelete}
                  onFileSelect={handleFileSelect}
                  onRetry={handleRetry}
                  onCancel={handleCancel}
                />
              )}
              {activeTab === 'files' && (
                <FilesView 
                  projects={projects}
                  onView={(id) => {
                    setActiveProjectId(id);
                    setActiveTab('transcripts');
                  }}
                  onDelete={handleDelete}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsView stats={stats} onClearAll={handleClearAll} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
