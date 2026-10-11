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

// Google Drive appDataFolder is hidden from the user's normal Drive UI and
// limits this app to files it creates in its own private app-data area.
export const DRIVE_BACKUP_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

// Initialize Firebase App singleton safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider for account authentication (identity scopes only).
// Keep Calendar API scopes on calendarProvider so normal sign-in does not request
// access to a user's calendar. Google Cloud consent-screen, audience, Firebase
// provider, or authorized-domain settings can still prevent authentication.
const authProvider = new GoogleAuthProvider();
authProvider.addScope(DRIVE_BACKUP_SCOPE);
authProvider.setCustomParameters({
  prompt: 'select_account',
});

// Provider specifically for Google Calendar API event creation (requests sensitive calendar scope)
const calendarProvider = new GoogleAuthProvider();
CALENDAR_SCOPES.forEach((scope) => calendarProvider.addScope(scope));
calendarProvider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (NEVER in localStorage/sessionStorage per security requirements)
let cachedAccessToken: string | null = null;
let cachedDriveAccessToken: string | null = null;
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
    cachedDriveAccessToken = null;
  }
  notifySubscribers();
});

/**
 * Sign in to Google (Standard Authentication)
 * Used for Account Authentication, 1-Tap Google Sign-In, and Cloud Sync.
 * Uses only basic identity scopes (profile, email) so it works seamlessly for ALL Google accounts without app verification blocks.
 */
export async function signInWithGoogle(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, authProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error('Google did not grant private Drive app-data access.');
    cachedDriveAccessToken = credential.accessToken;
    notifySubscribers();
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google account sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Encrypt backup data in the browser with a user-held passphrase before it reaches Drive.
 * The passphrase and derived key are never persisted or sent to any server.
 */
const BACKUP_FILE_NAME = 'supple-pulse-private-backup.json';
const BACKUP_ITERATIONS = 310000;

function requirePassphrase(passphrase: string): void {
  if (typeof passphrase !== 'string' || passphrase.length < 12) {
    throw new Error('Use a backup passphrase of at least 12 characters. Keep it somewhere safe; it cannot be recovered for you.');
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveBackupKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: BACKUP_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptBackup(payload: unknown, passphrase: string): Promise<string> {
  requirePassphrase(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return JSON.stringify({
    format: 'supple-pulse-encrypted-backup',
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: BACKUP_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  });
}

async function decryptBackup<T>(raw: unknown, passphrase: string): Promise<T> {
  requirePassphrase(passphrase);
  const envelope = raw as any;
  if (!envelope || envelope.format !== 'supple-pulse-encrypted-backup' ||
      envelope.version !== 1 || envelope.kdf !== 'PBKDF2-SHA256' ||
      envelope.cipher !== 'AES-256-GCM' || typeof envelope.salt !== 'string' ||
      typeof envelope.iv !== 'string' || typeof envelope.ciphertext !== 'string' ||
      envelope.iterations !== BACKUP_ITERATIONS) {
    throw new Error('This backup is not in the supported encrypted format. Create a new encrypted backup from the original device.');
  }
  try {
    const key = await deriveBackupKey(passphrase, fromBase64(envelope.salt));
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
      key,
      fromBase64(envelope.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new Error('Could not decrypt this backup. Check the passphrase and try again.');
  }
}

/** Google Drive stores only authenticated ciphertext; no backup plaintext or passphrase is sent to the server. */
export async function savePrivateDriveBackup(payload: unknown, passphrase: string): Promise<void> {
  if (!cachedDriveAccessToken) throw new Error('Sign in with Google and grant private Drive access first.');
  const encryptedText = await encryptBackup(payload, passphrase);
  const headers = { Authorization: `Bearer ${cachedDriveAccessToken}` };
  const listRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)', { headers });
  if (!listRes.ok) throw new Error(`Google Drive lookup failed (${listRes.status}). Please sign in again.`);
  const list = await listRes.json();
  const existing = (list.files || []).find((file: any) => file.name === BACKUP_FILE_NAME);
  const metadata = { name: BACKUP_FILE_NAME, ...(existing ? {} : { parents: ['appDataFolder'] }) };
  const body = new FormData();
  body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  body.append('file', new Blob([encryptedText], { type: 'application/json' }));
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(url, { method: existing ? 'PATCH' : 'POST', headers, body });
  if (!res.ok) throw new Error(`Google Drive backup failed (${res.status}).`);
}

export async function loadPrivateDriveBackup<T>(passphrase: string): Promise<T | null> {
  if (!cachedDriveAccessToken) throw new Error('Sign in with Google and grant private Drive access first.');
  const headers = { Authorization: `Bearer ${cachedDriveAccessToken}` };
  const listRes = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)', { headers });
  if (!listRes.ok) throw new Error(`Google Drive lookup failed (${listRes.status}). Please sign in again.`);
  const list = await listRes.json();
  const file = (list.files || []).find((item: any) => item.name === BACKUP_FILE_NAME);
  if (!file) return null;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`, { headers });
  if (!res.ok) throw new Error(`Google Drive restore failed (${res.status}).`);
  const encryptedText = await res.text();
  let envelope: unknown;
  try { envelope = JSON.parse(encryptedText); } catch {
    throw new Error('The Drive backup is not valid encrypted backup data.');
  }
  return decryptBackup<T>(envelope, passphrase);
}

/**
 * Sign in to Google with Calendar scopes (specifically for Google Calendar API sync)
 */
export async function signInWithGoogleCalendar(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, calendarProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign in');
    }
    cachedAccessToken = credential.accessToken;
    notifySubscribers();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Calendar sign-in error:', error);
    // Detect Google verification / 403 access_denied on sensitive calendar scopes
    if (
      error?.code === 'auth/access_denied' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.message?.includes('access_denied') ||
      error?.message?.includes('verification')
    ) {
      const msg = error?.code === 'auth/popup-closed-by-user'
        ? 'Sign-in popup was closed.'
        : 'Google Calendar direct API access requires developer verification for this cloud project. You can still instantly sync your regimens using the 1-Click "Add to Google Calendar" web link or "Download .ics Calendar", which require zero permissions!';
      const err = new Error(msg);
      (err as any).code = error?.code || 'GOOGLE_CALENDAR_UNVERIFIED';
      throw err;
    }
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

/**
 * Generates an iCalendar (.ics) format file containing ALL active supplements
 */
export function generateAllICalData(supplements: Supplement[]): string {
  const activeSupps = supplements.filter((s) => s.active);
  const nowUtc = new Date().toISOString().replace(/-|:|\.\d\d\d/g, '');
  const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const todayStr = formatDateToYYYYMMDD(new Date());

  const eventBlocks = activeSupps.map((supplement) => {
    const [hStr, mStr] = (supplement.doseTime || '09:00').split(':');
    const hours = parseInt(hStr, 10) || 9;
    const minutes = parseInt(mStr, 10) || 0;
    const start = parseYYYYMMDD(
      supplement.duration.startDate && supplement.duration.startDate >= todayStr
        ? supplement.duration.startDate
        : todayStr
    );
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 15);
    const rrule = buildRecurrenceRule(supplement)[0] || 'RRULE:FREQ=DAILY';

    return [
      'BEGIN:VEVENT',
      `UID:supplepulse-${supplement.id}-${Date.now()}@suppletrack.app`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART:${formatUtc(start)}`,
      `DTEND:${formatUtc(end)}`,
      `${rrule}`,
      `SUMMARY:💊 Take ${supplement.name} (${supplement.doseAmount} ${supplement.unit})`,
      `DESCRIPTION:Scheduled dose of ${supplement.name}. ${supplement.notes || ''} (Supple Pulse Protocol)`,
      'BEGIN:VALARM',
      'TRIGGER:-PT10M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: Take ${supplement.name}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Supple Pulse//Regimen Tracker//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Supple Pulse Regimen',
    ...eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Downloads a single .ics file containing all active supplements
 */
export function downloadAllSupplementsICalFile(supplements: Supplement[]): void {
  const ics = generateAllICalData(supplements);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'supple_pulse_all_regimens.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

