import { playReminderChime, triggerHaptic } from './soundEffects';

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  advanceMinutes: number; // 0 = at dose time, 15 = 15 mins before
  householdAlerts: boolean; // Also alert for Dad / Kids when in primary profile
}

const STORAGE_NOTIF_SETTINGS_KEY = 'suppletrack_notification_settings_v1';
const STORAGE_LAST_NOTIFIED_KEY = 'suppletrack_last_notified_doses_v1';

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    enabled: true,
    soundEnabled: true,
    vibrateEnabled: true,
    advanceMinutes: 0,
    householdAlerts: true,
  };
}

export function saveNotificationSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(STORAGE_NOTIF_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save notification settings', e);
  }
}

/**
 * Check if browser/mobile notification permission is granted
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.error('Error requesting notification permission', e);
    return 'denied';
  }
}

/**
 * Trigger a dose reminder notification with sound & haptic
 */
export function sendDoseNotification(options: {
  title: string;
  body: string;
  tag?: string;
  profileName?: string;
  requireInteraction?: boolean;
  onAction?: () => void;
}) {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  if (settings.soundEnabled) {
    playReminderChime();
  }
  if (settings.vibrateEnabled) {
    triggerHaptic('medium');
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(options.title, {
        body: options.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: options.tag || 'suppletrack-dose',
        requireInteraction: options.requireInteraction ?? false,
      });

      notif.onclick = () => {
        window.focus();
        if (options.onAction) options.onAction();
        notif.close();
      };
    } catch (e) {
      console.warn('Native notification display failed, relying on in-app toast', e);
    }
  }
}

/**
 * Track notified doses so the user isn't spammed multiple times for the same dose on the same day
 */
export function hasBeenNotifiedToday(doseKey: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_NOTIFIED_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return map[doseKey] === today;
  } catch {
    return false;
  }
}

export function markAsNotifiedToday(doseKey: string) {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_NOTIFIED_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const today = new Date().toISOString().slice(0, 10);
    map[doseKey] = today;
    localStorage.setItem(STORAGE_LAST_NOTIFIED_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Error marking notification', e);
  }
}
