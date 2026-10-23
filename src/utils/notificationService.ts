import { LocalNotifications } from '@capacitor/local-notifications';
import { playReminderChime, triggerHaptic } from './soundEffects';
import { Supplement } from '../types/supplement';
import { formatDateToYYYYMMDD } from './dates';

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
  if (typeof window !== 'undefined' && localStorage.getItem('suppletrack_alerts_enabled') === 'true') {
    return 'granted';
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user (Web + Capacitor)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('suppletrack_alerts_enabled', 'true');
  }

  // Capacitor native permissions if running in native wrapper
  try {
    const capStatus = await LocalNotifications.checkPermissions();
    if (capStatus.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    // Not running on Capacitor native platform or unsupported web runtime
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'granted';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.warn('Error requesting notification permission, fallback to in-app sound reminders:', e);
    return 'granted';
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

  // Capacitor native notification dispatch
  try {
    const notifId = Math.floor(Math.random() * 1000000);
    LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: options.title,
          body: options.body,
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'beep.wav',
          smallIcon: 'ic_stat_capsule',
        },
      ],
    }).catch(() => {});
  } catch (e) {
    // Web fallback
  }

  // Web Notification dispatch
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
 * Schedule upcoming dose alarms for today via Capacitor LocalNotifications
 */
export async function scheduleUpcomingDoseAlarms(supplements: Supplement[]): Promise<void> {
  try {
    const now = new Date();
    const todayStr = formatDateToYYYYMMDD(now);
    const notificationsToSchedule = [];

    for (let i = 0; i < supplements.length; i++) {
      const supp = supplements[i];
      if (!supp.doseTime) continue;

      const [hStr, mStr] = supp.doseTime.split(':');
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);

      const scheduledDate = new Date(now);
      scheduledDate.setHours(hour, minute, 0, 0);

      if (scheduledDate > now) {
        notificationsToSchedule.push({
          id: (i + 1) * 1000 + scheduledDate.getDate(),
          title: `Supple Pulse: ${supp.name}`,
          body: `Time for your scheduled ${supp.doseAmount.toLocaleString()} ${supp.unit} of ${supp.name}!`,
          schedule: { at: scheduledDate },
          sound: 'beep.wav',
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  } catch (err) {
    // Non-fatal if on pure web
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
