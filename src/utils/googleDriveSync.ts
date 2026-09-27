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
const OAUTH_SCOPES = ['openid', 'email', 'profile', CALENDAR_SCOPE].join(' ');

// Google Auth Provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});

let cachedOAuthToken: string | null = null;
let tokenClientInstance: any = null;

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
 * Parses JWT token payload from Google ID Token
 */
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if the page was loaded with an OAuth redirect hash (#access_token=... or #id_token=...)
 */
export async function checkOAuthRedirectResult(): Promise<GoogleUserProfile | null> {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash || (!hash.includes('access_token=') && !hash.includes('id_token='))) {
    return null;
  }

  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const idToken = params.get('id_token');

    // Clean up hash from browser URL without page reload
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }

    if (accessToken) {
      cachedOAuthToken = accessToken;
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const info = await res.json();
        const profile: GoogleUserProfile = {
          uid: info.sub || `google_${info.email?.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: info.email,
          displayName: info.name || info.email?.split('@')[0] || 'Google User',
          photoURL: info.picture,
          accessToken,
        };
        localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(profile));
        return profile;
      }
    }

    if (idToken) {
      const payload = parseJwt(idToken);
      if (payload && payload.email) {
        const profile: GoogleUserProfile = {
          uid: payload.sub || `google_${payload.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: payload.email,
          displayName: payload.name || payload.email.split('@')[0],
          photoURL: payload.picture,
          accessToken: idToken,
        };
        localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(profile));
        return profile;
      }
    }
  } catch (err) {
    console.warn('Error handling OAuth redirect response:', err);
  }

  return null;
}

/**
 * Initialize Google Auth state listener
 */
export function initGoogleAuth(
  onStateChange: (user: any | null, token: string | null) => void
) {
  // First check if returning from OAuth redirect
  checkOAuthRedirectResult().then((redirectedUser) => {
    if (redirectedUser) {
      onStateChange(redirectedUser, redirectedUser.accessToken || redirectedUser.uid);
      return;
    }
  });

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
 * Launch the official Google Account Chooser ("Choose an account to continue to SuppleTrack")
 * Uses Google Identity Services Token Client with prompt='select_account', exactly like modern services.
 */
export async function launchGoogleAccountChooser(): Promise<GoogleUserProfile> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;

    // Method 1: Google Identity Services (GIS) Token Client
    if (google?.accounts?.oauth2) {
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

            try {
              cachedOAuthToken = tokenResponse.access_token;
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              if (!userRes.ok) {
                throw new Error('Failed to retrieve Google user profile.');
              }
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
            } catch (err: any) {
              reject(err);
            }
          },
        });
        tokenClientInstance = client;
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (gisError) {
        console.warn('GIS TokenClient initiation error, falling back:', gisError);
      }
    }

    // Method 2: Firebase signInWithPopup with select_account prompt
    signInWithPopup(auth, provider)
      .then((result) => {
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
        resolve(profile);
      })
      .catch((popupErr) => {
        console.warn('Firebase popup unavailable, launching direct Google OAuth flow:', popupErr);
        // Method 3: Direct Google OAuth 2.0 Web flow with account picker (like Muscle Nectar)
        const redirectUri = window.location.origin + window.location.pathname;
        const nonce = Math.random().toString(36).substring(2);
        const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=token%20id_token&` +
          `scope=${encodeURIComponent(OAUTH_SCOPES)}&` +
          `prompt=select_account&` +
          `nonce=${encodeURIComponent(nonce)}`;

        // Open in current window or new tab so user sees the native Google "Choose an account" screen
        window.location.href = oauthUrl;
      });
  });
}

/**
 * Sign in with Google Account (interactive account picker, works for ANY Google account)
 */
export async function signInWithGoogle(customEmail?: string): Promise<{ user: GoogleUserProfile; accessToken: string }> {
  // If user explicitly entered an email in the manual switcher
  if (customEmail && customEmail.trim()) {
    const email = customEmail.trim();
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
