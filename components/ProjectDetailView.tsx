
import React, { useRef, useMemo } from 'react';
import { VideoProject, ChatMessage } from '../types';
import VideoPlayer from './VideoPlayer';
import TranscriptList from './TranscriptList';
import ChatInterface from './ChatInterface';
import { generateExportContent } from '../services/geminiService';

interface ProjectDetailViewProps {
  project: VideoProject;
  onBack: () => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  onSendMessage: (text: string) => void;
  isChatLoading: boolean;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ 
  project, onBack, currentTime, setCurrentTime, onSendMessage, isChatLoading 
}) => {
  const mediaRef = useRef<HTMLMediaElement>(null);

  const handleSeek = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = seconds;
      mediaRef.current.play();
    }
  };

  const handleDownload = () => {
    if (!project.data) return;
    const content = generateExportContent(project.data.transcript, 'txt');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.fileName}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeChapterIndex = useMemo(() => {
    if (!project.data?.chapters) return -1;
    const chapters = project.data.chapters;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (currentTime >= chapters[i].seconds) {
        return i;
      }
    }
    return -1;
  }, [project.data?.chapters, currentTime]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-900 transition-colors">Transcripts</button>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900">{project.fileName}</span>
        </div>
        <button 
          onClick={handleDownload}
          className="bg-white border border-gray-100 text-gray-900 px-5 py-2 rounded-xl hover:bg-gray-50 transition-all shadow-sm font-bold text-xs flex items-center gap-2"
        >
          <span className="material-icons-round text-sm">download</span>
          Download
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 shrink-0">
            <VideoPlayer 
              src={project.previewUrl || ''} 
              type={project.mediaType}
              ref={mediaRef}
              onTimeUpdate={setCurrentTime}
            />
          </div>

          {/* Chapters Section */}
          {project.data?.chapters && project.data.chapters.length > 0 && (
            <div className="flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] flex items-center gap-2">
                  <span className="material-icons-round text-brand-500 text-sm">bookmarks</span>
                  Video Chapters
                </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar scroll-smooth">
                {project.data.chapters.map((chapter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSeek(chapter.seconds)}
                    className="flex-none w-40 group text-left transition-all focus:outline-none"
                  >
                    <div className={`aspect-video rounded-xl border-2 mb-2 overflow-hidden relative flex items-center justify-center transition-all duration-300 ${
                      idx === activeChapterIndex 
                        ? 'border-brand-500 shadow-md shadow-brand-500/10 scale-[1.02]' 
                        : 'border-transparent bg-gray-100 hover:border-gray-200 hover:-translate-y-0.5'
                    }`}>
                      <div className={`absolute inset-0 transition-colors duration-300 ${
                        idx === activeChapterIndex ? 'bg-brand-500/10' : 'bg-brand-500/5 group-hover:bg-brand-500/10'
                      }`}></div>
                      
                      <span className={`material-icons-round transition-all duration-300 text-2xl ${
                        idx === activeChapterIndex ? 'text-brand-600 scale-110' : 'text-gray-300 group-hover:text-brand-300'
                      }`}>
                        {idx === activeChapterIndex ? 'pause_circle' : 'play_circle'}
                      </span>
                      
                      <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold font-mono tracking-tight">
                        {chapter.timestamp}
                      </div>
                    </div>
                    <p className={`text-[10px] font-bold line-clamp-2 leading-tight transition-colors duration-300 px-0.5 ${
                      idx === activeChapterIndex ? 'text-brand-600' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {chapter.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex-1 min-h-[400px]">
            <ChatInterface 
              messages={project.chatHistory || []}
              onSendMessage={onSendMessage}
              isLoading={isChatLoading}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 h-full">
          <div className="h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <TranscriptList 
              transcript={project.data?.transcript || []} 
              onSeek={handleSeek} 
              currentTime={currentTime} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailView;
