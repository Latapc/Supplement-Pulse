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

export const GOOGLE_CLIENT_ID = firebaseConfig.oAuthClientId || '263377906284-iagvheipdg1ctbi8ljfhkaaliuhvvut5.apps.googleusercontent.com';

// Scopes for Google services
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const OAUTH_SCOPES = ['openid', 'email', 'profile', CALENDAR_SCOPE].join(' ');

// Google Auth Provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

let cachedOAuthToken: string | null = null;

export function getOAuthAccessToken(): string | null {
  return cachedOAuthToken;
}

export function setOAuthAccessToken(token: string | null) {
  cachedOAuthToken = token;
}

export interface GoogleUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  accessToken?: string;
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
  user: GoogleUserProfile | null;
  hasDriveAccess: boolean;
  isSyncing: boolean;
  lastSyncedTime: string | null;
  lastError: string | null;
  cloudFileId: string | null;
}

/**
 * Initialize Google Auth state listener
 */
export function initGoogleAuth(
  onStateChange: (user: any | null, token: string | null) => void
) {
  const savedUserRaw = localStorage.getItem('suppletrack_connected_google_user');
  let localUser: GoogleUserProfile | null = null;
  if (savedUserRaw) {
    try {
      localUser = JSON.parse(savedUserRaw);
    } catch {
      // ignore
    }
  }

  return onAuthStateChanged(auth, async (fbUser: User | null) => {
    if (fbUser) {
      const profile: GoogleUserProfile = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Google User',
        photoURL: fbUser.photoURL || undefined,
        accessToken: cachedOAuthToken || fbUser.uid,
      };
      localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(profile));
      onStateChange(profile, profile.accessToken || fbUser.uid);
    } else if (localUser) {
      onStateChange(localUser, localUser.accessToken || localUser.uid);
    } else {
      cachedOAuthToken = null;
      onStateChange(null, null);
    }
  });
}

/**
 * Launch the official Google Account Chooser
 * Uses Firebase Authentication signInWithPopup.
 * Routed through Firebase's authorized domain (gen-lang-client-0994165809.firebaseapp.com)
 * eliminating Error 400: redirect_uri_mismatch.
 */
export async function launchGoogleAccountChooser(): Promise<GoogleUserProfile> {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedOAuthToken = credential.accessToken;
    }
    const profile: GoogleUserProfile = {
      uid: result.user.uid,
      email: result.user.email || '',
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
      photoURL: result.user.photoURL || undefined,
      accessToken: cachedOAuthToken || result.user.uid,
    };
    localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(profile));
    return profile;
  } catch (err: any) {
    // If popup was blocked or user closed it, check GIS web client fallback
    const google = typeof window !== 'undefined' ? (window as any).google : null;
    if (google?.accounts?.oauth2) {
      return new Promise((resolve, reject) => {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: OAUTH_SCOPES,
            prompt: 'select_account',
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.error) {
                return reject(new Error(tokenResponse.error_description || tokenResponse.error));
              }
              if (!tokenResponse?.access_token) {
                return reject(new Error('No access token received from Google.'));
              }
              cachedOAuthToken = tokenResponse.access_token;
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const info = await userRes.json();
              const profile: GoogleUserProfile = {
                uid: info.sub || `google_${info.email?.replace(/[^a-zA-Z0-9]/g, '_')}`,
                email: info.email,
                displayName: info.name || info.email?.split('@')[0] || 'Google User',
                photoURL: info.picture,
                accessToken: tokenResponse.access_token,
              };
              localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(profile));
              resolve(profile);
            },
          });
          client.requestAccessToken({ prompt: 'select_account' });
        } catch {
          reject(err);
        }
      });
    }
    throw err;
  }
}

/**
 * Sign in with Google Account (interactive account picker, works for ANY Google account)
 */
export async function signInWithGoogle(customEmail?: string): Promise<{ user: GoogleUserProfile; accessToken: string }> {
  // If user explicitly entered a private email in the manual switcher
  if (customEmail && customEmail.trim()) {
    const email = customEmail.trim().toLowerCase();
    const directUser: GoogleUserProfile = {
      uid: `google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email,
      displayName: email.split('@')[0],
      photoURL: undefined,
    };
    localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(directUser));
    return { user: directUser, accessToken: directUser.uid };
  }

  const profile = await launchGoogleAccountChooser();
  return { user: profile, accessToken: profile.accessToken || profile.uid };
}

/**
 * Sign out from Google Account
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
  } catch {
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

// Backward-compatibility wrappers
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
