
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

  const handleDownloadDefault = () => {
    if (!project.data) return;
    const content = generateExportContent(project.data.transcript, 'srt');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.fileName}.srt`;
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
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-900 transition-colors">Transcripts</button>
            <span className="text-gray-300">/</span>
            <span className="font-bold text-gray-900">{project.fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-[10px] font-black uppercase tracking-wider border border-green-100">
               <span className="material-icons-round text-[12px]">storage</span>
               Persisted Locally
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Last updated: {new Date(project.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
        <button 
          onClick={handleDownloadDefault}
          className="bg-brand-600 text-white px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-sm font-bold text-xs flex items-center gap-2"
        >
          <span className="material-icons-round text-sm">download</span>
          Download SRT
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8 h-auto lg:h-[calc(100vh-14rem)]">
        {/* Left Column: Player and Summary */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Media Player Card */}
          <div className="bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 shrink-0">
            <VideoPlayer 
              src={project.previewUrl || ''} 
              type={project.mediaType}
              ref={mediaRef}
              onTimeUpdate={setCurrentTime}
            />
          </div>

          {/* AI Summary Section */}
          {project.data?.summary && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-4 shrink-0">
              <div className="flex items-center gap-2 text-brand-600 mb-2">
                <span className="material-icons-round">auto_awesome</span>
                <h3 className="text-sm font-black uppercase tracking-widest">AI Content Summary</h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-sm lg:text-base font-medium">
                {project.data.summary}
              </p>
              
              {project.data.topics && (
                <div className="flex flex-wrap gap-2 pt-4">
                  {project.data.topics.map((topic, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-[11px] font-bold border border-gray-100">
                      #{topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
                    className="flex-none w-44 group text-left transition-all focus:outline-none"
                  >
                    <div className={`aspect-video rounded-2xl border-2 mb-3 overflow-hidden relative flex items-center justify-center transition-all duration-300 ${
                      idx === activeChapterIndex 
                        ? 'border-brand-500 shadow-lg shadow-brand-500/20 scale-[1.02]' 
                        : 'border-transparent bg-gray-100 hover:border-gray-200 hover:-translate-y-0.5'
                    }`}>
                      <div className={`absolute inset-0 transition-colors duration-300 ${
                        idx === activeChapterIndex ? 'bg-brand-500/10' : 'bg-brand-500/5 group-hover:bg-brand-500/10'
                      }`}></div>
                      <span className={`material-icons-round transition-all duration-300 text-3xl ${
                        idx === activeChapterIndex ? 'text-brand-600 scale-110' : 'text-gray-300 group-hover:text-brand-300'
                      }`}>
                        {idx === activeChapterIndex ? 'pause_circle' : 'play_circle'}
                      </span>
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg font-black font-mono tracking-tight">
                        {chapter.timestamp}
                      </div>
                    </div>
                    <p className={`text-[11px] font-black line-clamp-2 leading-snug transition-colors duration-300 px-1 ${
                      idx === activeChapterIndex ? 'text-brand-600' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {chapter.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Chat Section */}
          <div className="flex-1 min-h-[500px] mb-8 lg:mb-0">
            <ChatInterface 
              messages={project.chatHistory || []}
              onSendMessage={onSendMessage}
              isLoading={isChatLoading}
            />
          </div>
        </div>

        {/* Right Column: Persistent Transcript */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <div className="h-full bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col transition-all hover:shadow-md">
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
