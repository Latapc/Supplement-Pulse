import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Supplement, DayOfWeek } from '../types/supplement';
import { formatDateToYYYYMMDD, parseYYYYMMDD, calculateEndDate } from './dates';

// Scopes required for Google Calendar Events
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

// Initialize Firebase App singleton safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (NEVER in localStorage/sessionStorage per security requirements)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Subscribers for auth state changes
type AuthSubscriber = (user: User | null, token: string | null) => void;
const subscribers: Set<AuthSubscriber> = new Set();

export const subscribeGoogleAuth = (callback: AuthSubscriber): (() => void) => {
  subscribers.add(callback);
  // Initial emit
  callback(auth.currentUser, cachedAccessToken);
  return () => {
    subscribers.delete(callback);
  };
};

function notifySubscribers() {
  const currentUser = auth.currentUser;
  subscribers.forEach((cb) => cb(currentUser, cachedAccessToken));
}

// Initialize auth state listener
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
  notifySubscribers();
});

/**
 * Sign in to Google with Calendar scopes
 */
export async function signInWithGoogleCalendar(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign in');
    }
    cachedAccessToken = credential.accessToken;
    notifySubscribers();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Calendar sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Sign out from Google Calendar integration
 */
export async function signOutGoogleCalendar(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  notifySubscribers();
}

/**
 * Get current in-memory access token
 */
export function getCalendarAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Check if Google Calendar is authenticated with token
 */
export function isGoogleCalendarConnected(): boolean {
  return !!auth.currentUser && !!cachedAccessToken;
}

/**
 * Maps DayOfWeek index to RFC 5545 2-letter day abbreviation
 */
const RRULE_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Constructs an RFC 5545 Recurrence Rule based on supplement schedule
 */
export function buildRecurrenceRule(supplement: Supplement): string[] {
  const rules: string[] = [];

  // Determine recurrence frequency
  if (supplement.frequencyType === 'daily') {
    rules.push('RRULE:FREQ=DAILY');
  } else if (supplement.frequencyType === 'weekly') {
    const days = (supplement.selectedDays || [1]).map((d) => RRULE_DAYS[d] || 'MO');
    rules.push(`RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')}`);
  } else if (supplement.frequencyType === 'monthly') {
    const dayNum = supplement.monthlyDayOfMonth || 1;
    rules.push(`RRULE:FREQ=MONTHLY;BYMONTHDAY=${dayNum}`);
  } else if (supplement.frequencyType === 'interval') {
    const interval = Math.max(1, supplement.intervalDays || 2);
    rules.push(`RRULE:FREQ=DAILY;INTERVAL=${interval}`);
  } else {
    rules.push('RRULE:FREQ=DAILY');
  }

  // If fixed duration with end date, append UNTIL
  if (supplement.duration.type === 'fixed') {
    const endDateStr = supplement.duration.endDate || calculateEndDate(
      supplement.duration.startDate, 
      supplement.duration.periodValue || 1, 
      supplement.duration.periodUnit || 'months'
    );
    const endClean = endDateStr.replace(/-/g, '');
    // e.g. RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T235959Z
    rules[0] = `${rules[0]};UNTIL=${endClean}T235959Z`;
  }

  return rules;
}

/**
 * Builds Google Calendar Event payload for a supplement regimen
 */
export function buildEventPayload(supplement: Supplement) {
  const [hStr, mStr] = (supplement.doseTime || '09:00').split(':');
  const hours = parseInt(hStr, 10) || 9;
  const minutes = parseInt(mStr, 10) || 0;

  // Start date from duration or today
  const todayStr = formatDateToYYYYMMDD(new Date());
  const startDateStr = supplement.duration.startDate && supplement.duration.startDate >= todayStr
    ? supplement.duration.startDate
    : todayStr;

  const startDateObj = parseYYYYMMDD(startDateStr);
  startDateObj.setHours(hours, minutes, 0, 0);

  const endDateObj = new Date(startDateObj);
  endDateObj.setMinutes(endDateObj.getMinutes() + 15); // 15-minute intake window

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const foodInfo = supplement.foodTiming 
    ? `Timing: ${supplement.foodTiming.replace(/_/g, ' ')}`
    : '';

  const cycleInfo = supplement.cycleConfig?.isCyclic
    ? `Protocol: Cycle of ${supplement.cycleConfig.onDays} days ON, ${supplement.cycleConfig.offDays} days OFF.`
    : '';

  const notesInfo = supplement.notes ? `Clinical Notes: ${supplement.notes}` : '';

  const description = [
    `💊 Supple Pulse Regimen: ${supplement.name}`,
    `Dose: ${supplement.doseAmount.toLocaleString()} ${supplement.unit} (${supplement.form})`,
    `Category: ${supplement.category}`,
    foodInfo,
    cycleInfo,
    notesInfo,
    `\nTracked in Supple Pulse Smart Supplement Tracker.`
  ].filter(Boolean).join('\n');

  // Format ISO strings
  const startIso = startDateObj.toISOString();
  const endIso = endDateObj.toISOString();

  const recurrence = buildRecurrenceRule(supplement);

  return {
    summary: `💊 Take ${supplement.name} (${supplement.doseAmount.toLocaleString()} ${supplement.unit})`,
    description,
    start: {
      dateTime: startIso,
      timeZone,
    },
    end: {
      dateTime: endIso,
      timeZone,
    },
    recurrence,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
        { method: 'popup', minutes: 0 },
      ],
    },
    colorId: supplement.category === 'vitamins' ? '5' : supplement.category === 'minerals' ? '6' : '10',
  };
}

/**
 * Creates or updates a Google Calendar event for a supplement
 */
export async function syncSupplementToGoogleCalendar(
  supplement: Supplement
): Promise<{ eventId: string; htmlLink?: string }> {
  const token = getCalendarAccessToken();
  if (!token) {
    throw new Error('Google Calendar is not connected. Please connect with Google first.');
  }

  const payload = buildEventPayload(supplement);

  // If already has an event ID, attempt update (PATCH)
  if (supplement.googleCalendarEventId) {
    try {
      const updateRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(supplement.googleCalendarEventId)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (updateRes.ok) {
        const data = await updateRes.json();
        return { eventId: data.id, htmlLink: data.htmlLink };
      }
      
      // If 404, the event was deleted on calendar side, proceed to create new
      if (updateRes.status !== 404) {
        const errJson = await updateRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Google Calendar API returned status ${updateRes.status}`);
      }
    } catch (e: any) {
      if (e.message && !e.message.includes('404')) {
        console.warn('Could not patch existing calendar event, creating new one:', e);
      }
    }
  }

  // Create new event
  const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Calendar API error: ${createRes.status}`);
  }

  const result = await createRes.json();
  return { eventId: result.id, htmlLink: result.htmlLink };
}

/**
 * Deletes an event from Google Calendar (Requires User Confirmation dialog per guidelines)
 */
export async function deleteSupplementCalendarEvent(eventId: string): Promise<boolean> {
  const token = getCalendarAccessToken();
  if (!token || !eventId) return false;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return res.status === 204 || res.ok;
  } catch (err) {
    console.error('Failed to delete Google Calendar event:', err);
    return false;
  }
}

/**
 * Creates a prefilled Google Calendar Web URL (direct one-click web link)
 */
export function generateGoogleCalendarWebUrl(supplement: Supplement): string {
  const [hStr, mStr] = (supplement.doseTime || '09:00').split(':');
  const hours = parseInt(hStr, 10) || 9;
  const minutes = parseInt(mStr, 10) || 0;

  const todayStr = formatDateToYYYYMMDD(new Date());
  const start = parseYYYYMMDD(supplement.duration.startDate && supplement.duration.startDate >= todayStr ? supplement.duration.startDate : todayStr);
  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 15);

  const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const datesParam = `${formatUtc(start)}/${formatUtc(end)}`;

  const title = encodeURIComponent(`💊 Take ${supplement.name} (${supplement.doseAmount.toLocaleString()} ${supplement.unit})`);
  const details = encodeURIComponent(
    `Take ${supplement.name} ${supplement.doseAmount} ${supplement.unit}. ${supplement.foodTiming ? `(${supplement.foodTiming.replace(/_/g, ' ')})` : ''}\nTracked with Supple Pulse.`
  );

  const recurrenceRule = buildRecurrenceRule(supplement)[0]?.replace(/^RRULE:/, '') || 'FREQ=DAILY';
  const recurParam = encodeURIComponent(`RRULE:${recurrenceRule}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${datesParam}&recur=${recurParam}`;
}

/**
 * Generates an iCalendar (.ics) format file string for universal calendar export
 */
export function generateICalData(supplement: Supplement): string {
  const [hStr, mStr] = (supplement.doseTime || '09:00').split(':');
  const hours = parseInt(hStr, 10) || 9;
  const minutes = parseInt(mStr, 10) || 0;

  const todayStr = formatDateToYYYYMMDD(new Date());
  const start = parseYYYYMMDD(supplement.duration.startDate && supplement.duration.startDate >= todayStr ? supplement.duration.startDate : todayStr);
  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 15);

  const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const rrule = buildRecurrenceRule(supplement)[0] || 'RRULE:FREQ=DAILY';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Supple Pulse//Regimen Tracker//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:supplepulse-${supplement.id}-${Date.now()}@suppletrack.app`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `${rrule}`,
    `SUMMARY:💊 Take ${supplement.name} (${supplement.doseAmount} ${supplement.unit})`,
    `DESCRIPTION:Scheduled dose of ${supplement.name}. ${supplement.notes || ''}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder to take ${supplement.name}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a download of the .ics file for a supplement
 */
export function downloadICalFile(supplement: Supplement): void {
  const ics = generateICalData(supplement);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${supplement.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_schedule.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
