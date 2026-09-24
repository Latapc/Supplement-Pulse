import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Clock, 
  Moon, 
  Send,
  AlertTriangle
} from 'lucide-react';
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  requestNotificationPermission, 
  sendSystemNotification,
  playReminderChime,
  NotificationSettings
} from '../utils/notifications';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [permState, setPermState] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getNotificationSettings());
      if ('Notification' in window) {
        setPermState(Notification.permission);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (updated: Partial<NotificationSettings>) => {
    const next = { ...settings, ...updated };
    setSettings(next);
    saveNotificationSettings(next);
  };

  const handleEnablePermission = async () => {
    const res = await requestNotificationPermission();
    setPermState(res);
    if (res === 'granted') {
      sendSystemNotification('💊 SuppleTrack Notifications Active!', {
        body: "You'll receive scheduled reminders when it is time to take your vitamins.",
      });
    }
  };

  const handleSendTest = () => {
    sendSystemNotification('⏰ Test Dose Reminder: Morning Vitamins', {
      body: 'Time to take Vitamin D3 (60,000 IU) with your morning meal.',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                Dose Notifications & Alarms
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Scheduled notifications for morning, afternoon & bedtime regimens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Permission Status Card */}
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-emerald-500" />
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                    Device Notification Permission
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Status:{' '}
                    <span className={`font-semibold capitalize ${
                      permState === 'granted'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : permState === 'denied'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {permState}
                    </span>
                  </p>
                </div>
              </div>

              {permState !== 'granted' ? (
                <button
                  onClick={handleEnablePermission}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                >
                  Enable Permissions
                </button>
              ) : (
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  Enabled
                </div>
              )}
            </div>

            {permState === 'denied' && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Notifications are blocked in your browser settings. Tap the lock icon in the URL bar to allow notifications.
                </span>
              </div>
            )}
          </div>

          {/* Test Notification Trigger */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
            <div>
              <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                Test Reminder Alert
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Play alert chime and trigger instant test notification on this device
              </p>
            </div>
            <button
              onClick={handleSendTest}
              className="px-4 py-2 rounded-xl bg-white dark:bg-stone-800 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-50 dark:hover:bg-stone-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              {testSent ? 'Sent!' : 'Send Test'}
            </button>
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Master Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800">
              <div>
                <span className="font-semibold text-sm text-stone-900 dark:text-white block">
                  Enable Scheduled Reminders
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  Notify when a scheduled dose time matches current time
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleUpdate({ enabled: e.target.checked })}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
            </div>

            {/* Audio Chime */}
            <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <span className="font-semibold text-sm text-stone-900 dark:text-white block">
                    Audio Chime Alert
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    Play pleasant chime on dose reminders
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playReminderChime()}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Preview Tone
                </button>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => handleUpdate({ soundEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
              </div>
            </div>

            {/* Remind Timing */}
            <div className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-stone-900 dark:text-white block">
                    Reminder Offset
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    When to trigger notification
                  </span>
                </div>
              </div>
              <select
                value={settings.remindMinutesBefore}
                onChange={(e) => handleUpdate({ remindMinutesBefore: Number(e.target.value) })}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-xs font-semibold text-stone-900 dark:text-white"
              >
                <option value={0}>At exact dose time</option>
                <option value={5}>5 minutes before</option>
                <option value={10}>10 minutes before</option>
                <option value={15}>15 minutes before</option>
              </select>
            </div>

            {/* Quiet Hours */}
            <div className="py-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-stone-900 dark:text-white block">
                      Quiet Hours
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      Silence reminders during sleep
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.quietHoursEnabled}
                  onChange={(e) => handleUpdate({ quietHoursEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
              </div>

              {settings.quietHoursEnabled && (
                <div className="flex items-center gap-3 pl-11 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
                    <span>From</span>
                    <input
                      type="time"
                      value={settings.quietHoursStart}
                      onChange={(e) => handleUpdate({ quietHoursStart: e.target.value })}
                      className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
                    <span>Until</span>
                    <input
                      type="time"
                      value={settings.quietHoursEnd}
                      onChange={(e) => handleUpdate({ quietHoursEnd: e.target.value })}
                      className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50/50 dark:bg-stone-900/40 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
          <span>Active background monitor checks doses every 30 seconds</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
