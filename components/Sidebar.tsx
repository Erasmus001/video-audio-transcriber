
import React from 'react';
import { NavTab } from '../App';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'transcripts', icon: 'description', label: 'Transcripts' },
    { id: 'files', icon: 'folder', label: 'Files' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white">
          <span className="material-icons-round text-xl">video_library</span>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-gray-900">VideoScripter</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as NavTab)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === item.id 
                ? 'bg-brand-50 text-brand-600 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="material-icons-round text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'settings' 
              ? 'bg-brand-50 text-brand-600 shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <span className="material-icons-round text-lg">settings</span>
          Settings
        </button>
        
        <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-brand-200 border-2 border-white flex items-center justify-center">
            <span className="material-icons-round text-brand-600 text-sm">person</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-gray-900 truncate">Alex Scripter</p>
            <p className="text-[10px] text-gray-500 truncate">Pro Account</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
