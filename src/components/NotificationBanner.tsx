import React from 'react';
import { Bell, Volume2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { playChimeSound } from '../utils/audio';

interface NotificationBannerProps {
  permission: NotificationPermission;
  onRequestPermission: () => void;
  onSendTestNotification: () => void;
  onTestSound: () => void;
  nextDoseText?: string;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  permission,
  onRequestPermission,
  onSendTestNotification,
  onTestSound,
  nextDoseText,
}) => {
  if (permission === 'granted') {
    return null; // Keep screen clean when already granted
  }

  return (
    <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 sm:p-5 shadow-xs border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white font-display">
            Enable Dose Alerts & Sound Reminders
          </h4>
          <p className="text-xs text-stone-300 mt-0.5 max-w-xl">
            Supple Pulse can notify you in your browser the moment your scheduled dose arrives, complete with audio chime reminders.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onTestSound}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Test Sound</span>
        </button>

        <button
          onClick={onRequestPermission}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition shadow-xs"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Allow Notifications</span>
        </button>
      </div>
    </div>
  );
};
