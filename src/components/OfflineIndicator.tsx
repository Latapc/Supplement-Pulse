import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 p-3 bg-stone-900 text-white border border-stone-700 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Working Offline. Your supplement logs will sync when reconnected.</span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="p-1 text-stone-400 hover:text-white transition"
        title="Check connection"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
