import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Check, 
  AlertTriangle, 
  X, 
  Sparkles,
  Heart,
  Clock
} from 'lucide-react';
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendDoseNotification,
  NotificationSettings
} from '../utils/notificationService';
import { playReminderChime, triggerHaptic } from '../utils/soundEffects';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfileName: string;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  activeProfileName,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [testSent, setTestSent] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setSettings(getNotificationSettings());
      setTestSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    triggerHaptic('medium');
    if (res === 'granted') {
      const updated = { ...settings, enabled: true };
      setSettings(updated);
      saveNotificationSettings(updated);
      playReminderChime();
    }
  };

  const handleToggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (updated.soundEnabled) {
      playReminderChime();
    }
  };

  const handleToggleVibrate = () => {
    const updated = { ...settings, vibrateEnabled: !settings.vibrateEnabled };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (updated.vibrateEnabled) {
      triggerHaptic('medium');
    }
  };

  const handleToggleHousehold = () => {
    const updated = { ...settings, householdAlerts: !settings.householdAlerts };
    setSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleSendTestNotification = () => {
    triggerHaptic('success');
    sendDoseNotification({
      title: `💊 Dose Reminder: Vitamin D3 (60,000 IU)`,
      body: `Time for ${activeProfileName}'s scheduled supplement! Remember to take with water.`,
      tag: 'test-reminder',
      requireInteraction: true,
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-amber-50/70 via-stone-50 to-stone-50 dark:from-amber-950/20 dark:via-stone-900 dark:to-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-syne text-stone-900 dark:text-stone-100">
                Dose Notifications & Alerts
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Timely reminders on Android mobile and browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Permission Status Card */}
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-[#231f1c] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Device Notification Permission
              </span>
              {permission === 'granted' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3" /> ENABLED
                </span>
              ) : permission === 'denied' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> BLOCKED IN BROWSER
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  NOT CONFIGURED
                </span>
              )}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              {permission === 'granted'
                ? 'Your device allows Supple Pulse to pop up dosage alerts even when multitasking.'
                : permission === 'denied'
                ? 'Notifications are blocked in your browser settings. To enable, tap the lock/settings icon in your address bar.'
                : 'Allow notifications so you never miss a weekly or daily supplement booster.'}
            </p>

            {permission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition shadow-sm flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" /> Enable Device Notifications
              </button>
            )}
          </div>

          {/* Alert Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Alert Preferences
            </h4>

            {/* Sound Chimes */}
            <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Audio Chime Reminders
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Play gentle dual-bell chime when doses are due
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={handleToggleSound}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            {/* Android Haptic Vibration */}
            <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Android Haptic Vibration
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Vibrate phone on dosage alerts & taken confirmation
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.vibrateEnabled}
                onChange={handleToggleVibrate}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            {/* Household / Dad Care Alerts */}
            <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Household Caregiver Alerts
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Also alert me for Dad's & Kids' doses when logged in
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.householdAlerts}
                onChange={handleToggleHousehold}
                className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Test Notification Trigger */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="w-full py-3 px-4 rounded-2xl border border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 font-medium text-xs flex items-center justify-center gap-2 transition"
            >
              <Bell className="w-4 h-4" />
              <span>{testSent ? '✓ Notification Triggered!' : 'Send Test Notification to Device'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-100 dark:bg-[#231f1c] border-t border-stone-200 dark:border-stone-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 text-white dark:text-stone-900 font-semibold text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
