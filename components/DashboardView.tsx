
import React, { useRef } from 'react';
import { VideoProject } from '../types';

interface DashboardViewProps {
  stats: { count: number; hours: number; minutes: number; sizeGB: string };
  recentProjects: VideoProject[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onFileSelect: (file: File) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ stats, recentProjects, onView, onDelete, onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`material-icons-round text-xl ${color}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
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

      <div className="flex flex-wrap gap-6">
        <StatCard label="Total transcripts" value={stats.count} icon="description" color="text-blue-500" />
        <StatCard label="Total transcript hours" value={`${stats.hours}hrs ${stats.minutes}mins`} icon="schedule" color="text-amber-500" />
        <StatCard label="Total transcript sizes" value={`${stats.sizeGB}GB`} icon="data_usage" color="text-brand-500" />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Recent transcripts</h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-50">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Filename</th>
                <th className="px-6 py-4 font-semibold text-gray-600">File type</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Duration</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Time Taken</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Date created</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No recent activity. Start your first transcription!</td>
                </tr>
              ) : (
                recentProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 truncate max-w-[200px]" title={p.fileName}>{p.fileName}</span>
                        <span className="text-[10px] text-gray-400">{(p.fileSize / (1024 * 1024)).toFixed(1)}MB</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.mediaType === 'video' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {p.mediaType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {Math.floor((p.duration || 0) / 60)}m {(p.duration || 0) % 60}s
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {p.processingTime ? `${(p.processingTime / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'completed' && (
                          <button onClick={() => onView(p.id)} className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                            <span className="material-icons-round text-lg">visibility</span>
                          </button>
                        )}
                        <button onClick={() => onDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
