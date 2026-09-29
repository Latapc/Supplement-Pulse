// Client-side Discord-style Security & IP Authentication Service
// Built with W3C Credential Management API & Android Autofill Support

declare const __CLOUD_BACKEND_URL__: string | undefined;

export interface DiscordAuthUser {
  id: string;
  email: string;
  displayName: string;
  authorizedIps: string[];
  currentIp?: string;
  token?: string;
}

export interface SecurityEmailLog {
  id: string;
  to: string;
  subject: string;
  type: 'registration_verify' | 'new_ip_login';
  ip: string;
  verificationLink: string;
  sentAt: string;
  contentSnippet: string;
  token: string;
}

const LOCAL_STORAGE_USER_KEY = 'supplepulse_discord_auth_user';

export function getApiUrl(endpoint: string): string {
  if (typeof window === 'undefined') return endpoint;
  
  const isCapacitorNative = 
    Boolean((window as any).Capacitor?.isNativePlatform?.()) || 
    window.location.origin === 'https://localhost' || 
    window.location.origin.startsWith('capacitor://');

  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (isCapacitorNative) {
    const cloudUrl = (typeof __CLOUD_BACKEND_URL__ !== 'undefined' && __CLOUD_BACKEND_URL__)
      ? __CLOUD_BACKEND_URL__
      : 'https://ais-pre-p3la4lr6wdctj7sor2qxpy-206831609121.asia-southeast1.run.app';
    return `${cloudUrl.replace(/\/+$/, '')}${cleanPath}`;
  }

  return cleanPath;
}

async function safeFetchJson(endpoint: string, options?: RequestInit): Promise<any> {
  const url = getApiUrl(endpoint);
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`Network connection error. Please ensure internet access is available (${netErr?.message || 'offline'}).`);
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned unexpected response (${res.status}). Please check server connection.`);
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }

  return data;
}

export function getStoredDiscordUser(): DiscordAuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredDiscordUser(user: DiscordAuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  } catch {}
}

export async function getClientIp(): Promise<string> {
  try {
    const data = await safeFetchJson('/api/auth/client-ip');
    return data.ip || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

export async function registerWithDiscordSecurity(params: {
  email: string;
  password: string;
  displayName?: string;
}) {
  return await safeFetchJson('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function loginWithDiscordSecurity(params: {
  email: string;
  password: string;
}) {
  const data = await safeFetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (data.authorized && data.user) {
    setStoredDiscordUser({
      ...data.user,
      token: data.token,
    });
  }

  return data;
}

export async function checkIpAuthorizationStatus(token: string) {
  const data = await safeFetchJson(`/api/auth/check-ip-status?token=${encodeURIComponent(token)}`);

  if (data.authorized && data.user) {
    setStoredDiscordUser({
      ...data.user,
      token: data.token,
    });
  }

  return data;
}

export async function verifyTokenDirectly(token: string) {
  return await safeFetchJson('/api/auth/verify-ip-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

export async function resendVerificationEmail(params: { token?: string; email?: string }) {
  return await safeFetchJson('/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function fetchRecentSecurityEmails(email?: string): Promise<SecurityEmailLog[]> {
  try {
    const path = email ? `/api/auth/recent-emails?email=${encodeURIComponent(email)}` : '/api/auth/recent-emails';
    const data = await safeFetchJson(path);
    return data.emails || [];
  } catch {
    return [];
  }
}

export async function revokeAuthorizedIp(email: string, ipToRevoke: string) {
  const data = await safeFetchJson('/api/auth/revoke-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ipToRevoke }),
  });
  
  const current = getStoredDiscordUser();
  if (current && current.email.toLowerCase() === email.toLowerCase()) {
    current.authorizedIps = data.authorizedIps || [];
    setStoredDiscordUser(current);
  }
  return data;
}

export function logoutDiscordUser() {
  setStoredDiscordUser(null);
}

// -------------------------------------------------------------
// W3C Credential Management API & Password Manager Integration
// -------------------------------------------------------------

/**
 * Triggers Google Password Manager / OS credential selector.
 * Supported on Chrome, Android WebView, and modern password managers.
 */
export async function requestSavedPasswordCredentials(conditional = false): Promise<{ id: string; password?: string } | null> {
  if (typeof window === 'undefined') return null;
  const nav = navigator as any;

  if (nav?.credentials?.get && (window as any).PasswordCredential) {
    try {
      const cred = await nav.credentials.get({
        password: true,
        mediation: conditional ? 'conditional' : 'optional',
      });
      if (cred && cred.id) {
        return {
          id: cred.id,
          password: cred.password || '',
        };
      }
    } catch {
      // User dismissed or conditional request unfulfilled
    }
  }
  return null;
}

/**
 * Tells Google Password Manager / OS to prompt:
 * "Save password to Google Password Manager?"
 * Provides both email (id) and password.
 */
export async function promptSaveCredentialsToManager(params: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const nav = navigator as any;

  if (nav?.credentials?.store && (window as any).PasswordCredential) {
    try {
      const cred = new (window as any).PasswordCredential({
        id: params.email.trim(),
        password: params.password,
        name: params.displayName?.trim() || params.email.trim(),
      });
      await nav.credentials.store(cred);
      return true;
    } catch (err) {
      console.warn('Native password manager prompt skipped:', err);
    }
  }
  return false;
}
