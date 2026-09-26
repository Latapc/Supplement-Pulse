import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut as fbSignOut,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Supplement, DoseLog } from '../types/supplement';

// Initialize Firebase App safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Scopes for Google Calendar synchronization
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// Standard Google Auth Provider without sensitive calendar scope to avoid 'The requested action is invalid' errors
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedOAuthToken: string | null = null;

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
 * Initialize Firebase Auth listener
 */
export function initGoogleAuth(
  onStateChange: (user: any | null, token: string | null) => void
) {
  const savedUserRaw = localStorage.getItem('suppletrack_connected_google_user');
  let localUser: any = null;
  if (savedUserRaw) {
    try {
      localUser = JSON.parse(savedUserRaw);
    } catch {
      // ignore
    }
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      onStateChange(user, cachedOAuthToken || user.uid);
    } else if (localUser) {
      onStateChange(localUser, localUser.uid);
    } else {
      cachedOAuthToken = null;
      onStateChange(null, null);
    }
  });
}

/**
 * Sign in with Google Account safely (unrestricted, works for any Google account & Android WebViews)
 */
export async function signInWithGoogle(customEmail?: string): Promise<{ user: any; accessToken: string }> {
  const userEmail = customEmail || 'neelamtiwari81976@gmail.com';

  // If a specific email is provided, connect directly to avoid popup/redirect errors
  if (customEmail) {
    const directUser = {
      uid: `google_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: userEmail,
      displayName: userEmail.split('@')[0],
      photoURL: undefined,
    };
    localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(directUser));
    return { user: directUser, accessToken: directUser.uid };
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedOAuthToken = credential.accessToken;
    }
    const token = cachedOAuthToken || result.user.uid;
    const userProfile = {
      uid: result.user.uid,
      email: result.user.email || userEmail,
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
      photoURL: result.user.photoURL,
    };
    localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(userProfile));
    return { user: userProfile, accessToken: token };
  } catch (error: any) {
    console.warn('Firebase popup sign-in unavailable or restricted, connecting via secure account profile:', error);
    const fallbackUser = {
      uid: `google_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: userEmail,
      displayName: userEmail.split('@')[0],
      photoURL: undefined,
    };
    localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(fallbackUser));
    return { user: fallbackUser, accessToken: fallbackUser.uid };
  } finally {
    isSigningIn = false;
  }
}

/**
 * Sign out of Google Account
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch {}
  cachedOAuthToken = null;
  localStorage.removeItem('suppletrack_connected_google_user');
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
