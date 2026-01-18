
import React, { useState, useRef } from 'react';
import { VideoProject } from '../types';

interface TranscriptsViewProps {
  projects: VideoProject[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onFileSelect: (file: File) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

const TranscriptsView: React.FC<TranscriptsViewProps> = ({ projects, onView, onDelete, onFileSelect, onRetry, onCancel }) => {
  const [tab, setTab] = useState<'all' | 'video' | 'audio'>('all');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = projects.filter(p => {
    const matchesTab = tab === 'all' || p.mediaType === tab;
    const matchesSearch = p.fileName.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Transcripts</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-brand-600 text-white px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-sm font-semibold flex items-center gap-2"
        >
          <span className="material-icons-round">add</span>
          + Transcribe
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} 
          className="hidden" 
          accept="video/*,audio/*"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          {['all', 'video', 'audio'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`flex-1 sm:flex-none px-6 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
          <input 
            type="text" 
            placeholder="Search transcripts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((p) => (
          <div key={p.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
            <div className="aspect-video bg-gray-50 relative flex items-center justify-center overflow-hidden">
               {p.mediaType === 'video' ? (
                 <video src={p.previewUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
               ) : (
                 <span className="material-icons-round text-4xl text-brand-100 group-hover:text-brand-300 transition-colors">audiotrack</span>
               )}
               <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all"></div>
               {p.status === 'completed' ? (
                 <button 
                  onClick={() => onView(p.id)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-brand-900/40 text-white"
                 >
                   <span className="material-icons-round text-3xl">play_circle</span>
                 </button>
               ) : p.status === 'failed' ? (
                 <button 
                  onClick={() => onRetry(p.id)}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-red-900/40 text-white"
                 >
                   <span className="material-icons-round text-3xl">refresh</span>
                 </button>
               ) : (
                 <div className="absolute inset-0 flex items-center justify-center bg-brand-900/20 text-white">
                   <div className="relative flex flex-col items-center gap-2">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                     <button 
                       onClick={(e) => { e.stopPropagation(); onCancel(p.id); }}
                       className="p-1 bg-white/20 hover:bg-white/40 rounded-full transition-colors"
                       title="Cancel"
                     >
                       <span className="material-icons-round text-sm">close</span>
                     </button>
                   </div>
                 </div>
               )}
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 truncate" title={p.fileName}>{p.fileName}</h4>
                <p className="text-[10px] text-gray-400 mt-1">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </p>
                {p.status === 'failed' && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium italic">Transcription failed</p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-50">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.mediaType === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {p.mediaType}
                 </span>
                 <button onClick={() => onDelete(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                   <span className="material-icons-round text-lg">delete</span>
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-gray-400">No transcripts found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default TranscriptsView;
