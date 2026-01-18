
import React, { useRef } from 'react';
import { VideoProject } from '../types';

interface DashboardViewProps {
  stats: { count: number; hours: number; minutes: number; sizeGB: string; active: number };
  recentProjects: VideoProject[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onFileSelect: (file: File) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ stats, recentProjects, onView, onDelete, onFileSelect, onRetry, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1 min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`material-icons-round text-xl ${color}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-brand-600 text-white px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-all shadow-sm font-semibold flex items-center gap-2"
        >
          <span className="material-icons-round">add</span>
          New Transcription
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} 
          className="hidden" 
          accept="video/*,audio/*"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Transcripts" value={stats.count} icon="description" color="text-blue-500" />
        <StatCard label="Transcription Hours" value={`${stats.hours}h ${stats.minutes}m`} icon="schedule" color="text-amber-500" />
        <StatCard label="Local Storage Used" value={`${stats.sizeGB}GB`} icon="data_usage" color="text-brand-500" />
        <StatCard label="Processing Now" value={stats.active} icon="sync" color={stats.active > 0 ? "text-brand-600 animate-spin" : "text-gray-300"} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Recent Activity</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Filename</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Type</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Size</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No transcripts yet. Upload a file to begin analysis.</td>
                </tr>
              ) : (
                recentProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 truncate block max-w-[240px]" title={p.fileName}>{p.fileName}</span>
                      <span className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      {p.status === 'processing' ? (
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-brand-500 h-full transition-all duration-500" style={{ width: `${p.progress || 0}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-brand-600">{p.progress}%</span>
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-500 text-xs">{p.mediaType}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{(p.fileSize / (1024 * 1024)).toFixed(1)}MB</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'completed' && (
                          <button onClick={() => onView(p.id)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="View Transcript">
                            <span className="material-icons-round text-lg">visibility</span>
                          </button>
                        )}
                        {p.status === 'failed' && (
                          <button onClick={() => onRetry(p.id)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Retry Transcription">
                            <span className="material-icons-round text-lg">refresh</span>
                          </button>
                        )}
                        {p.status === 'processing' && (
                          <button onClick={() => onCancel(p.id)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Cancel Analysis">
                            <span className="material-icons-round text-lg">cancel</span>
                          </button>
                        )}
                        <button onClick={() => onDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <span className="material-icons-round text-lg">delete</span>
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
    </div>
  );
};

export default DashboardView;
