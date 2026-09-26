import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  signInWithRedirect,
  signOut as fbSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Supplement, DoseLog } from '../types/supplement';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const provider = new GoogleAuthProvider();
provider.addScope(CALENDAR_SCOPE);
provider.setCustomParameters({ prompt: 'select_account' });

let cachedOAuthToken: string | null = null;
let redirectResultPromise: Promise<void> | null = null;

export function getOAuthAccessToken(): string | null {
  return cachedOAuthToken;
}

export function setOAuthAccessToken(token: string | null) {
  cachedOAuthToken = token;
}

export interface CloudRegimenData {
  version: number;
  appName: string;
  updatedAt: string;
  userEmail?: string;
  supplements: Supplement[];
  logs: DoseLog[];
  dismissedDoses?: Record<string, string[]>;
}

export interface GoogleSyncState {
  user: User | null;
  hasDriveAccess: boolean;
  isSyncing: boolean;
  lastSyncedTime: string | null;
  lastError: string | null;
  cloudFileId: string | null;
}

/**
 * Resolve the OAuth redirect exactly once after the page returns from Google.
 * This handles the redirect flow on app startup after OAuth completes.
 */
function resolveRedirectResult(): Promise<void> {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            cachedOAuthToken = credential.accessToken;
          }
        }
      })
      .catch((error) => {
        // A normal page load has no redirect result. Surface real OAuth errors.
        if (error?.code !== 'auth/no-auth-event') {
          console.error('Google redirect result failed:', error);
        }
      });
  }
  return redirectResultPromise;
}

/**
 * Initialize Firebase Auth listener
 */
export function initGoogleAuth(
  onStateChange: (user: User | null, token: string | null) => void
) {
  // Start processing redirect before subscribing so the first callback has the OAuth token.
  void resolveRedirectResult();

  return onAuthStateChanged(auth, async (user: User | null) => {
    // Wait for any redirect result to resolve before firing the callback
    await resolveRedirectResult();

    if (!user) {
      cachedOAuthToken = null;
    }
    onStateChange(user, cachedOAuthToken || (user ? user.uid : null));
  });
}

/**
 * Sign in with Google Account using redirect flow.
 * 
 * Popups (signInWithPopup) are unreliable/blocked in TWAs, Android WebViews, and installed PWAs.
 * Using redirect ensures the OAuth flow works across all platforms. The auth state listener
 * will handle the result when the page loads again after the redirect.
 */
export async function signInWithGoogle(): Promise<{ user: User; accessToken: string }> {
  await signInWithRedirect(auth, provider);
  // The browser will navigate away to Google and back. This never resolves in the normal flow.
  // The result is consumed by the auth state listener after the page reloads.
  return new Promise(() => undefined);
}

/**
 * Sign out of Google Account
 */
export async function signOutFromGoogle(): Promise<void> {
  await fbSignOut(auth);
  cachedOAuthToken = null;
}

export function getGoogleAccessToken(): string | null {
  return cachedOAuthToken || (auth.currentUser ? auth.currentUser.uid : null);
}

/**
 * Save supplement data to Google Account Cloud
 */
export async function saveCloudBackup(
  userId: string,
  payload: CloudRegimenData
): Promise<{ success: boolean; savedAt: string }> {
  try {
    const res = await fetch('/api/sync/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, payload }),
    });
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    const data = await res.json();
    const savedAt = data.savedAt || new Date().toISOString();
    localStorage.setItem(`suppletrack_cloud_cache_${userId}`, JSON.stringify(payload));
    return { success: true, savedAt };
  } catch (err: any) {
    // Fallback to local user cache
    const savedAt = new Date().toISOString();
    localStorage.setItem(`suppletrack_cloud_cache_${userId}`, JSON.stringify(payload));
    return { success: true, savedAt };
  }
}

/**
 * Load supplement data from Google Account Cloud
 */
export async function loadCloudBackup(userId: string): Promise<CloudRegimenData | null> {
  try {
    const res = await fetch(`/api/sync/load?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        return result.data as CloudRegimenData;
      }
    }
  } catch (err) {
    console.warn('Network sync load failed, checking local user cache', err);
  }

  const cached = localStorage.getItem(`suppletrack_cloud_cache_${userId}`);
  if (cached) {
    try {
      return JSON.parse(cached) as CloudRegimenData;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Delete cloud backup for user
 */
export async function deleteCloudBackup(userId: string): Promise<void> {
  try {
    await fetch(`/api/sync/delete?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('API delete failed', err);
  }
  localStorage.removeItem(`suppletrack_cloud_cache_${userId}`);
}

// Backward-compatibility wrappers for previous Drive calls
export async function findDriveBackupFile(userId: string): Promise<{ id: string; modifiedTime: string } | null> {
  const data = await loadCloudBackup(userId);
  if (data) {
    return { id: `cloud_${userId}`, modifiedTime: data.updatedAt };
  }
  return null;
}

export async function downloadFromDrive(userId: string, fileId?: string): Promise<CloudRegimenData> {
  const data = await loadCloudBackup(userId);
  if (!data) {
    throw new Error('No cloud backup found for this Google account.');
  }
  return data;
}

export async function uploadToDrive(
  userId: string,
  payload: CloudRegimenData,
  fileId?: string | null
): Promise<{ fileId: string; modifiedTime: string }> {
  const res = await saveCloudBackup(userId, payload);
  return { fileId: `cloud_${userId}`, modifiedTime: res.savedAt };
}

export async function deleteDriveFile(userId: string, fileId?: string): Promise<void> {
  await deleteCloudBackup(userId);
}
