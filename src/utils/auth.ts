import { GoogleUser } from '../types/auth';

const STORAGE_GOOGLE_USER_KEY = 'suppletrack_google_user_v1';

export function getStoredGoogleUser(): GoogleUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_GOOGLE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to parse stored Google user', e);
    return null;
  }
}

export function setStoredGoogleUser(user: GoogleUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_GOOGLE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_GOOGLE_USER_KEY);
    }
  } catch (e) {
    console.error('Failed to persist Google user', e);
  }
}
