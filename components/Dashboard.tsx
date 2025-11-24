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
    if (!timestamp || isNaN(timestamp)) return '-';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatTimeTaken = (ms?: number) => {
    if (!ms) return '-';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
           <p className="text-gray-500 text-sm mt-1">Manage your transcription projects</p>
        </div>
        <button 
          onClick={onNewUpload}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm flex items-center gap-2 font-medium"
        >
          <span className="material-icons-round">add</span>
          Add Media
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <span className="material-icons-round text-5xl text-gray-300 mb-4">folder_open</span>
            <p className="text-lg">No projects yet.</p>
            <p className="text-sm">Upload a video or audio file to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-700">Project Name</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Duration</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Time Taken</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          project.mediaType === 'audio' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <span className="material-icons-round text-xl">
                            {project.mediaType === 'audio' ? 'audiotrack' : 'movie'}
                          </span>
                        </div>
                        <div className="max-w-[200px] lg:max-w-xs">
                           <div className="font-medium text-gray-900 truncate" title={project.fileName}>
                             {project.fileName}
                           </div>
                           <div className="text-xs text-gray-500">
                             {(project.fileSize / (1024 * 1024)).toFixed(1)} MB
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                        {project.mediaType}
                      </span>
                    </td>
                    <td className="px-6 py-4 w-64">
                      {project.status === 'processing' ? (
                        <div className="w-full">
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-xs font-medium text-brand-700">
                               {project.progress && project.progress < 30 ? 'Uploading...' : 'Analyzing...'}
                             </span>
                             <span className="text-xs text-brand-600 font-bold">{Math.round(project.progress || 0)}%</span>
                           </div>
                           <div className="w-full bg-brand-100 rounded-full h-2 overflow-hidden">
                             <div 
                               className="bg-brand-500 h-2 rounded-full transition-all duration-500 ease-out"
                               style={{ width: `${Math.round(project.progress || 0)}%` }}
                             ></div>
                           </div>
                        </div>
                      ) : (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          project.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                          project.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                             project.status === 'completed' ? 'bg-green-500' :
                             project.status === 'failed' ? 'bg-red-500' :
                             'bg-gray-500'
                          }`}></span>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </div>
                      )}
                      {project.error && (
                        <div className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={project.error}>
                          {project.error}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {formatDuration(project.duration)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {formatTimeTaken(project.processingTime)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {formatDate(project.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {project.status === 'completed' && (
                          <button 
                            onClick={() => onView(project.id)}
                            className="text-brand-600 hover:text-brand-800 p-1 rounded transition-colors"
                            title="View"
                          >
                            <span className="material-icons-round text-lg">visibility</span>
                          </button>
                        )}
                        
                        {project.status === 'processing' && (
                          <button 
                            onClick={() => onStop(project.id)}
                            className="text-amber-500 hover:text-amber-700 p-1 rounded transition-colors"
                            title="Stop"
                          >
                             <span className="material-icons-round text-lg">stop_circle</span>
                          </button>
                        )}
                        
                        {(project.status === 'failed' || project.status === 'cancelled') && (
                          <button 
                            onClick={() => onRetry(project.id)}
                            className="text-brand-600 hover:text-brand-800 p-1 rounded transition-colors"
                            title="Retry"
                          >
                             <span className="material-icons-round text-lg">refresh</span>
                          </button>
                        )}

                        {project.status !== 'processing' && (
                          <button 
                            onClick={() => onDelete(project.id)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                            title="Delete"
                          >
                            <span className="material-icons-round text-lg">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;