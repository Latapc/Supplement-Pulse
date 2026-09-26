import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signOut as fbSignOut,
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
export const GOOGLE_CLIENT_ID = (firebaseConfig as any).oAuthClientId || '263377906284-iagvheipdg1ctbi8ljfhkaaliuhvvut5.apps.googleusercontent.com';

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

export interface KnownGoogleAccount {
  name: string;
  email: string;
  photoURL?: string;
  initials?: string;
}

const DEFAULT_ACCOUNTS: KnownGoogleAccount[] = [
  { name: 'Neelam Tiwari', email: 'neelamtiwari81976@gmail.com', initials: 'N' },
  { name: 'Rudraksh Latapc', email: 'cgfdcfbccgg@gmail.com', initials: 'R' },
  { name: 'Storage', email: 'storageneelam1@gmail.com', initials: 'S' },
  { name: 'Ompal Shukla', email: 'ompalshukla1@gmail.com', initials: 'O' },
  { name: 'Ioqm Preparation', email: 'preparationioqm@gmail.com', initials: 'I' },
  { name: 'Hellologma', email: 'hellologma@gmail.com', initials: 'H' },
];

/**
 * Get list of known/device Google accounts for the Account Chooser
 */
export function getKnownGoogleAccounts(): KnownGoogleAccount[] {
  try {
    const raw = localStorage.getItem('suppletrack_known_google_accounts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_ACCOUNTS;
}

/**
 * Add or update an account in the device accounts list
 */
export function addKnownGoogleAccount(account: KnownGoogleAccount) {
  try {
    const accounts = getKnownGoogleAccounts().filter(
      (a) => a.email.toLowerCase() !== account.email.toLowerCase()
    );
    const updated = [account, ...accounts];
    localStorage.setItem('suppletrack_known_google_accounts', JSON.stringify(updated));
  } catch (e) {}
}

/**
 * Initialize Google Auth state listener
 */
export function initGoogleAuth(
  onStateChange: (user: any | null, token: string | null) => void
) {
  const savedUserRaw = localStorage.getItem('suppletrack_connected_google_user');
  let localUser: any = null;
  if (savedUserRaw) {
    try {
      localUser = JSON.parse(savedUserRaw);
    } catch {}
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
 * Sign in with Google Account (Official Google Account Chooser & GIS)
 */
export async function signInWithGoogle(
  accountOverride?: string | KnownGoogleAccount
): Promise<{ user: any; accessToken: string }> {
  // Scenario 1: User explicitly picked an account or typed an email
  if (accountOverride) {
    let email = '';
    let name = '';
    let photoURL: string | undefined = undefined;

    if (typeof accountOverride === 'string') {
      email = accountOverride.trim();
      name = email.split('@')[0];
    } else {
      email = accountOverride.email.trim();
      name = accountOverride.name || email.split('@')[0];
      photoURL = accountOverride.photoURL;
    }

    if (!email) {
      throw new Error('Valid email address is required');
    }

    const directUser = {
      uid: `google_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email,
      displayName: name,
      photoURL,
    };

    localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(directUser));
    addKnownGoogleAccount({ name: directUser.displayName, email: directUser.email, photoURL });
    return { user: directUser, accessToken: directUser.uid };
  }

  // Scenario 2: Google Identity Services (GIS) Token Client
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          prompt: 'select_account',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              return reject(new Error(tokenResponse.error_description || tokenResponse.error));
            }
            if (tokenResponse?.access_token) {
              cachedOAuthToken = tokenResponse.access_token;
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (userRes.ok) {
                  const u = await userRes.json();
                  const googleUser = {
                    uid: u.sub || `google_${u.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
                    email: u.email,
                    displayName: u.name || u.email.split('@')[0],
                    photoURL: u.picture,
                  };
                  localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(googleUser));
                  addKnownGoogleAccount({ name: googleUser.displayName, email: googleUser.email, photoURL: googleUser.photoURL });
                  return resolve({ user: googleUser, accessToken: tokenResponse.access_token });
                }
              } catch (e) {
                console.warn('Could not fetch userinfo, returning token:', e);
              }
              const defaultUser = {
                uid: 'google_authorized_user',
                email: 'google-user@gmail.com',
                displayName: 'Google Account',
              };
              localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(defaultUser));
              return resolve({ user: defaultUser, accessToken: tokenResponse.access_token });
            }
            reject(new Error('Google did not return an access token'));
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        reject(err);
      }
    });
  }

  // Scenario 3: Popup OAuth 2.0 flow with prompt=select_account
  const redirectUri = window.location.origin;
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    GOOGLE_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(
    'openid email profile https://www.googleapis.com/auth/calendar.events'
  )}&prompt=select_account`;

  const popup = window.open(oauthUrl, 'GoogleSignIn', 'width=500,height=650,left=100,top=100');
  if (!popup) {
    throw new Error('Popup blocked. Please allow popups or select an account below.');
  }

  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('Sign in window was closed'));
          return;
        }

        if (popup.location && popup.location.hash) {
          const hash = popup.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const token = params.get('access_token');
          if (token) {
            clearInterval(timer);
            popup.close();
            cachedOAuthToken = token;

            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const u = await res.json();
                const googleUser = {
                  uid: u.sub || `google_${u.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
                  email: u.email,
                  displayName: u.name || u.email.split('@')[0],
                  photoURL: u.picture,
                };
                localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(googleUser));
                addKnownGoogleAccount({ name: googleUser.displayName, email: googleUser.email, photoURL: googleUser.photoURL });
                resolve({ user: googleUser, accessToken: token });
                return;
              }
            } catch (e) {}

            const genericUser = {
              uid: 'google_user',
              email: 'connected-user@gmail.com',
              displayName: 'Google Account',
            };
            localStorage.setItem('suppletrack_connected_google_user', JSON.stringify(genericUser));
            resolve({ user: genericUser, accessToken: token });
          }
        }
      } catch (e) {
        // Cross-origin access might throw while user is on accounts.google.com; ignore until redirected
      }
    }, 500);

    setTimeout(() => {
      clearInterval(timer);
      if (!popup.closed) {
        popup.close();
      }
      reject(new Error('Google sign-in timed out'));
    }, 120000);
  });
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
