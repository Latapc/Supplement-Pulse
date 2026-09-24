import { Supplement, DoseLog, UserProfile } from '../types/supplement';
import { playDoseLoggedChime } from './audio';

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  remindMinutesBefore: number; // e.g. 0, 5, 10
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
}

const STORAGE_NOTIF_SETTINGS_KEY = 'suppletrack_notif_settings_v1';
const STORAGE_LAST_TRIGGERED_KEY = 'suppletrack_notif_triggered_v1';

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    enabled: true,
    soundEnabled: true,
    remindMinutesBefore: 0,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  };
}

export function saveNotificationSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(STORAGE_NOTIF_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

export function playReminderChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Pleasant dual-chime bell
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6
    gain2.gain.setValueAtTime(0.14, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.8);
  } catch (e) {
    console.warn('Audio chime playback failed:', e);
  }
}

/**
 * Dispatch a system notification with mobile vibration
 */
export function sendSystemNotification(
  title: string,
  options?: NotificationOptions & { playSound?: boolean }
) {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  // Sound chime
  if (options?.playSound !== false && settings.soundEnabled) {
    playReminderChime();
  }

  // Mobile vibration pattern if supported on Android
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (err) {
      console.warn('System notification error:', err);
    }
  }
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHoursEnabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = settings.quietHoursStart.split(':').map(Number);
  const [eH, eM] = settings.quietHoursEnd.split(':').map(Number);
  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;

  if (startMinutes > endMinutes) {
    // Overnight e.g. 22:00 to 07:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Evaluate pending doses and trigger scheduled notification if dose time matches now
 */
export function checkDoseNotifications(
  supplements: Supplement[],
  logs: DoseLog[],
  profiles: UserProfile[],
  activeProfileId: string
) {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;
  if (isQuietHours(settings)) return;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDayOfWeek = now.getDay();

  // Load recently triggered timestamps to prevent duplicate alerts within same hour/day
  let triggeredMap: Record<string, string> = {};
  try {
    triggeredMap = JSON.parse(localStorage.getItem(STORAGE_LAST_TRIGGERED_KEY) || '{}');
  } catch (e) {}

  supplements.forEach((supp) => {
    if (supp.archived) return;

    // Check if scheduled today
    let scheduledToday = false;
    if (supp.frequencyType === 'daily') {
      scheduledToday = true;
    } else if (supp.frequencyType === 'weekly') {
      scheduledToday = (supp.selectedDays || []).includes(currentDayOfWeek as any);
    } else if (supp.frequencyType === 'monthly') {
      scheduledToday = supp.monthlyDayOfMonth === now.getDate();
    }

    if (!scheduledToday) return;

    // Check if already taken today
    const alreadyTaken = logs.some(
      (l) => l.supplementId === supp.id && l.date === todayStr
    );
    if (alreadyTaken) return;

    // Parse dose time
    const [dH, dM] = (supp.doseTime || '09:00').split(':').map(Number);
    
    // Check if current minute matches dose time or within remindMinutesBefore window
    const targetMinutes = dH * 60 + dM - (settings.remindMinutesBefore || 0);
    const nowMinutes = currentHour * 60 + currentMinute;

    if (Math.abs(nowMinutes - targetMinutes) <= 1) {
      const triggerKey = `${supp.id}_${todayStr}_${dH}_${dM}`;
      if (triggeredMap[triggerKey]) return; // already triggered today

      // Identify profile
      const prof = profiles.find((p) => p.id === supp.profileId) || profiles[0] || { name: 'You' };
      const foodTip = supp.foodTiming && supp.foodTiming !== 'anytime' ? ` (${supp.foodTiming.replace(/_/g, ' ')})` : '';

      sendSystemNotification(`⏰ Dose Reminder: ${prof.name}`, {
        body: `Time to take ${supp.name} (${supp.doseAmount} ${supp.unit})${foodTip}`,
        tag: `dose_${supp.id}`,
      });

      triggeredMap[triggerKey] = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_LAST_TRIGGERED_KEY, JSON.stringify(triggeredMap));
      } catch (e) {}
    }
  });
}
