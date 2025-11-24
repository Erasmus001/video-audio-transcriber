import React from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface NotificationToastProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => (
        <div 
          key={n.id}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-white transform transition-all animate-fade-in-up min-w-[300px] backdrop-blur-md ${
            n.type === 'success' ? 'bg-gray-900/95 border border-gray-700' : 'bg-red-600/95 border border-red-500'
          }`}
        >
          <span className="material-icons-round text-2xl">
            {n.type === 'success' ? 'check_circle' : 'error_outline'}
          </span>
          <div className="flex-1">
             <h4 className="font-semibold text-sm">{n.type === 'success' ? 'Success' : 'Error'}</h4>
             <p className="text-sm opacity-90">{n.message}</p>
          </div>
          <button 
            onClick={() => onDismiss(n.id)} 
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity p-1"
          >
            <span className="material-icons-round text-sm">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;