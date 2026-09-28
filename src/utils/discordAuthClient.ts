// Client-side Discord-style Security & IP Authentication Service

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
    const res = await fetch('/api/auth/client-ip');
    const data = await res.json();
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
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  return data;
}

export async function loginWithDiscordSecurity(params: {
  email: string;
  password: string;
}) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }

  if (data.authorized && data.user) {
    setStoredDiscordUser({
      ...data.user,
      token: data.token,
    });
  }

  return data;
}

export async function checkIpAuthorizationStatus(token: string) {
  const res = await fetch(`/api/auth/check-ip-status?token=${encodeURIComponent(token)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Check failed');
  }

  if (data.authorized && data.user) {
    setStoredDiscordUser({
      ...data.user,
      token: data.token,
    });
  }

  return data;
}

export async function verifyTokenDirectly(token: string) {
  const res = await fetch('/api/auth/verify-ip-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Verification failed');
  return data;
}

export async function resendVerificationEmail(params: { token?: string; email?: string }) {
  const res = await fetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Resend failed');
  return data;
}

export async function fetchRecentSecurityEmails(email?: string): Promise<SecurityEmailLog[]> {
  try {
    const url = email ? `/api/auth/recent-emails?email=${encodeURIComponent(email)}` : '/api/auth/recent-emails';
    const res = await fetch(url);
    const data = await res.json();
    return data.emails || [];
  } catch {
    return [];
  }
}

export async function revokeAuthorizedIp(email: string, ipToRevoke: string) {
  const res = await fetch('/api/auth/revoke-ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ipToRevoke }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to revoke IP');
  
  // Update local user state if currently stored
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
