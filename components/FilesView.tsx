
import React, { useMemo } from 'react';
import { VideoProject } from '../types';

interface FilesViewProps {
  projects: VideoProject[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

const FilesView: React.FC<FilesViewProps> = ({ projects, onView, onDelete }) => {
  const storageStats = useMemo(() => {
    const totalBytes = projects.reduce((acc, p) => acc + p.fileSize, 0);
    const totalMB = totalBytes / (1024 * 1024);
    // Hypothetical quota of 500MB for the demo app, or just show usage
    const limitMB = 500;
    const percent = Math.min((totalMB / limitMB) * 100, 100);
    
    return {
      used: totalMB.toFixed(1),
      limit: limitMB,
      percent: percent.toFixed(1),
      count: projects.length
    };
  }, [projects]);

  const handleDownloadSource = (project: VideoProject) => {
    const url = URL.createObjectURL(project.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = project.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-12 animate-fade-in-up py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Internal Storage</h2>
          <p className="text-gray-500 text-sm mt-2">Manage source media files stored locally in your browser.</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-16 transition-all hover:shadow-md">
        <div className="relative w-40 h-40 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="72"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-gray-100"
            />
            <circle
              cx="80"
              cy="80"
              r="72"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={452.4}
              strokeDashoffset={452.4 - (452.4 * Number(storageStats.percent)) / 100}
              className="text-brand-500 transition-all duration-1000"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-gray-900">{storageStats.percent}%</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Used</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-8 text-center sm:text-left">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Space Used</p>
              <p className="text-3xl font-black text-gray-900">{storageStats.used} <span className="text-lg font-medium text-gray-400">MB</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Stored Files</p>
              <p className="text-3xl font-black text-gray-900">{storageStats.count}</p>
            </div>
          </div>
          <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100/50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <span className="material-icons-round text-brand-600">info</span>
            </div>
            <p className="text-xs text-brand-800 leading-relaxed">
              Files are saved in your browser's <span className="font-bold underline decoration-brand-200">IndexedDB</span>. 
              Clearing browser site data will remove these files permanently.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 font-bold text-gray-600 uppercase tracking-wider text-[10px]">Media File</th>
              <th className="px-8 py-5 font-bold text-gray-600 uppercase tracking-wider text-[10px]">Type</th>
              <th className="px-8 py-5 font-bold text-gray-600 uppercase tracking-wider text-[10px]">Size</th>
              <th className="px-8 py-5 font-bold text-gray-600 uppercase tracking-wider text-[10px]">Added</th>
              <th className="px-8 py-5 font-bold text-gray-600 uppercase tracking-wider text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                       <span className="material-icons-round text-gray-200 text-4xl">folder_off</span>
                    </div>
                    <p className="text-gray-400 text-lg font-medium">Storage is empty</p>
                    <p className="text-gray-300 text-sm">Your uploaded media will appear here.</p>
                  </div>
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        p.mediaType === 'audio' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <span className="material-icons-round text-xl">
                          {p.mediaType === 'audio' ? 'audiotrack' : 'movie'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 truncate block max-w-[240px]" title={p.fileName}>
                          {p.fileName}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-tighter">{p.mimeType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      p.mediaType === 'audio' ? 'bg-purple-100/50 text-purple-700' : 'bg-blue-100/50 text-blue-700'
                    }`}>
                      {p.mediaType}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-gray-600 text-xs font-mono font-bold">
                    {(p.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </td>
                  <td className="px-8 py-5 text-gray-400 text-xs font-medium">
                    {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleDownloadSource(p)} 
                        className="p-2.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                        title="Download Source File"
                      >
                        <span className="material-icons-round text-xl">download</span>
                      </button>
                      {p.status === 'completed' && (
                        <button 
                          onClick={() => onView(p.id)} 
                          className="p-2.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                          title="Open Transcript"
                        >
                          <span className="material-icons-round text-xl">visibility</span>
                        </button>
                      )}
                      <button 
                        onClick={() => onDelete(p.id)} 
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Permanently"
                      >
                        <span className="material-icons-round text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FilesView;
