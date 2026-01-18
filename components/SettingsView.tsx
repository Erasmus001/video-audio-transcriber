
import React, { useState } from 'react';

interface SettingsViewProps {
  stats: { sizeGB: string; count: number };
  onClearAll: () => void;
}

type SettingsSection = 'account' | 'preferences' | 'storage' | 'system';

const SettingsView: React.FC<SettingsViewProps> = ({ stats, onClearAll }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [autoScroll, setAutoScroll] = useState(true);
  const [exportFormat, setExportFormat] = useState('srt');
  const [isClearing, setIsClearing] = useState(false);

  const navItems = [
    { id: 'account', icon: 'person', label: 'Account' },
    { id: 'preferences', icon: 'tune', label: 'Preferences' },
    { id: 'storage', icon: 'storage', label: 'Storage' },
    { id: 'system', icon: 'info', label: 'About' },
  ];

  const handleClearData = () => {
    if (window.confirm("Are you absolutely sure? This will delete all transcripts, chat histories, and media files from this browser permanently.")) {
      setIsClearing(true);
      setTimeout(() => {
        onClearAll();
        setIsClearing(false);
      }, 1000);
    }
  };

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="mb-8">
      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-12 animate-fade-in-up py-4">
      {/* Settings Navigation */}
      <aside className="w-full lg:w-64 shrink-0">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as SettingsSection)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeSection === item.id 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' 
                  : 'text-gray-500 hover:bg-white hover:text-gray-900'
              }`}
            >
              <span className="material-icons-round text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Settings Content */}
      <div className="flex-1 max-w-3xl">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 lg:p-12 min-h-[500px]">
          {activeSection === 'account' && (
            <div className="animate-fade-in">
              <SectionHeader title="Account Settings" subtitle="Manage your personal information and subscription." />
              
              <div className="space-y-8">
                <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-brand-200 flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                      <span className="material-icons-round text-brand-600 text-3xl">person</span>
                    </div>
                    <button className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                      <span className="material-icons-round text-sm">edit</span>
                    </button>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Alex Scripter</h4>
                    <p className="text-xs text-gray-500 font-medium">alex@videoscriptor.ai</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-brand-100 text-brand-700 rounded-md text-[10px] font-black uppercase tracking-wider">Pro Plan</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Display Name</label>
                    <input type="text" defaultValue="Alex Scripter" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                    <input type="email" defaultValue="alex@videoscriptor.ai" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium" />
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                   <div>
                      <p className="font-bold text-gray-900 text-sm">Monthly Subscription</p>
                      <p className="text-xs text-gray-500">Next billing date: March 15, 2025</p>
                   </div>
                   <button className="text-brand-600 hover:text-brand-700 font-bold text-sm bg-brand-50 px-4 py-2 rounded-xl transition-colors">Manage Billing</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="animate-fade-in">
              <SectionHeader title="Application Preferences" subtitle="Customize your transcription and UI experience." />
              
              <div className="space-y-8">
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer" onClick={() => setAutoScroll(!autoScroll)}>
                   <div>
                     <p className="font-bold text-gray-900 text-sm">Auto-scroll Transcripts</p>
                     <p className="text-xs text-gray-500">Automatically follow media playback in the transcript view.</p>
                   </div>
                   <button className={`w-12 h-6 rounded-full transition-all relative ${autoScroll ? 'bg-brand-500' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoScroll ? 'left-7' : 'left-1 shadow-sm'}`}></div>
                   </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Default Export Format</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['srt', 'txt', 'json'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setExportFormat(f)}
                        className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                          exportFormat === f 
                            ? 'bg-brand-50 border-brand-500 text-brand-600 shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-gray-50">
                  <p className="font-bold text-gray-900 text-sm">Transcription Language</p>
                  <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium">
                    <option>Automatic Detection</option>
                    <option>English (US)</option>
                    <option>Spanish (ES)</option>
                    <option>French (FR)</option>
                    <option>German (DE)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'storage' && (
            <div className="animate-fade-in">
              <SectionHeader title="Storage Management" subtitle="Monitor and clear your local IndexedDB storage." />
              
              <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Local Usage</p>
                    <p className="text-3xl font-black text-gray-900">{stats.sizeGB} <span className="text-lg text-gray-400">GB</span></p>
                    <p className="text-xs text-gray-500 mt-1">{stats.count} items stored</p>
                  </div>
                  <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center">
                    <span className="material-icons-round text-brand-600 text-3xl">data_usage</span>
                  </div>
                </div>

                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                  <h4 className="font-bold text-red-900 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-700 leading-relaxed mb-6">
                    Clearing all data will permanently delete your entire library including source files, 
                    transcripts, and chat history. This action cannot be undone.
                  </p>
                  <button 
                    onClick={handleClearData}
                    disabled={isClearing}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                  >
                    {isClearing ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <span className="material-icons-round text-lg">delete_forever</span>
                    )}
                    Clear All Local Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="animate-fade-in">
              <SectionHeader title="About VideoScripter" subtitle="Application info and connectivity status." />
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                       <span className="material-icons-round text-brand-500">bolt</span>
                     </div>
                     <div>
                       <p className="font-bold text-gray-900 text-sm">Gemini AI Status</p>
                       <p className="text-xs text-gray-500">Connected to gemini-3-flash-preview</p>
                     </div>
                   </div>
                   <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                     Active
                   </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Version</p>
                    <p className="font-bold text-gray-900 mt-1">2.4.0-stable</p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Build ID</p>
                    <p className="font-bold text-gray-900 mt-1">#55291</p>
                  </div>
                </div>

                <div className="space-y-3 pt-6">
                  <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl border border-gray-50 transition-colors group">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">View Documentation</span>
                    <span className="material-icons-round text-gray-400">open_in_new</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl border border-gray-50 transition-colors group">
                    <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">Report a Bug</span>
                    <span className="material-icons-round text-gray-400">bug_report</span>
                  </button>
                </div>

                <div className="pt-8 text-center">
                   <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] mb-4">Crafted with Precision</p>
                   <div className="flex justify-center gap-4 text-gray-400">
                      <span className="material-icons-round hover:text-brand-500 cursor-pointer">facebook</span>
                      <span className="material-icons-round hover:text-brand-500 cursor-pointer">alternate_email</span>
                      <span className="material-icons-round hover:text-brand-500 cursor-pointer">share</span>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
