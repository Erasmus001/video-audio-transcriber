import React from 'react';
import { VideoProject } from '../types';

interface DashboardProps {
  projects: VideoProject[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onStop: (id: string) => void;
  onNewUpload: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  projects, 
  onView, 
  onDelete, 
  onRetry, 
  onStop,
  onNewUpload 
}) => {
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatProcessingTime = (ms?: number) => {
    if (ms === 0) return <span className="text-green-600 font-medium">Cached</span>;
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Completed</span>;
      case 'processing':
        return (
          <div className="flex items-center gap-2 text-brand-600">
             <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span className="text-xs font-medium">Processing...</span>
          </div>
        );
      case 'failed':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Failed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Stopped</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Queued</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Library</h2>
        <button 
          onClick={onNewUpload}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <span className="material-icons-round text-lg">add</span>
          Add Media
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <span className="material-icons-round text-gray-300 text-6xl mb-4">video_library</span>
          <p className="text-gray-500 text-lg">No media added yet.</p>
          <p className="text-gray-400 text-sm mt-1">Upload a video or audio file to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-400 font-medium tracking-wider">
                <th className="px-6 py-4">File Name</th>
                <th className="px-6 py-4">Added</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Time Taken</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${project.mediaType === 'audio' ? 'bg-purple-600' : 'bg-gray-900'}`}>
                         <span className="material-icons-round">
                           {project.mediaType === 'audio' ? 'audiotrack' : 'movie'}
                         </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 truncate max-w-[200px]" title={project.fileName}>{project.fileName}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-xs text-gray-400">{(project.fileSize / (1024 * 1024)).toFixed(1)} MB</p>
                           {project.sourceUrl && <span className="text-xs bg-gray-100 text-gray-500 px-1 rounded">WEB</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(project.createdAt)}
                  </td>
                   <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {formatDuration(project.duration)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {formatProcessingTime(project.processingTime)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(project.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {project.status === 'completed' && (
                        <button 
                          onClick={() => onView(project.id)}
                          className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                          title="View Analysis"
                        >
                          <span className="material-icons-round">visibility</span>
                        </button>
                      )}
                      
                      {project.status === 'processing' && (
                         <button 
                           onClick={() => onStop(project.id)}
                           className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                           title="Stop/Cancel"
                         >
                           <span className="material-icons-round">stop</span>
                         </button>
                      )}

                      {(project.status === 'failed' || project.status === 'cancelled') && (
                        <button 
                          onClick={() => onRetry(project.id)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Retry"
                        >
                          <span className="material-icons-round">refresh</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => onDelete(project.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <span className="material-icons-round">delete_outline</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Dashboard;