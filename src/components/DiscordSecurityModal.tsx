import React, { useState } from 'react';
import { CloudDownload, CloudUpload, LogIn, LogOut, ShieldCheck, X } from 'lucide-react';
import { signInWithGoogle, signOutGoogleCalendar } from '../utils/googleCalendar';
import { DiscordAuthUser } from '../utils/discordAuthClient';

interface DiscordSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DiscordAuthUser | null;
  onUserChange: (user: DiscordAuthUser | null) => void;
  onSyncRegimen?: () => Promise<void>;
  onRestoreRegimen?: () => Promise<void>;
  localSupplementsCount?: number;
}

export const DiscordSecurityModal: React.FC<DiscordSecurityModalProps> = ({
  isOpen, onClose, currentUser, onUserChange, onSyncRegimen, onRestoreRegimen,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { user } = await signInWithGoogle();
      onUserChange({
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email || 'Google user',
        authorizedIps: [],
      });
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutGoogleCalendar();
      onUserChange(null);
      setMessage('Signed out of Google.');
    } catch (e: any) {
      setError(e?.message || 'Could not sign out.');
    } finally {
      setLoading(false);
    }
  };

  const runBackupAction = async (action?: () => Promise<void>, label?: string) => {
    if (!action) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      if (label) setMessage(label);
    } catch (e: any) {
      setError(e?.message || 'Google Drive operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="google-account-title">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300"><ShieldCheck size={24} /></div>
            <div>
              <h2 id="google-account-title" className="text-xl font-semibold">Private Google account</h2>
              <p className="mt-1 text-sm text-slate-400">No Supple Pulse password or IP allowlist.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
          Your data is encrypted in the browser before it is uploaded to Google Drive. Sign in with the same Google account on another device to restore it automatically. For convenience, the encryption key is stored in a separate file in that account's private app-data area; this means the design is not developer-blind encryption.
        </div>

        {currentUser ? (
          <>
            <div className="mb-4 rounded-2xl bg-emerald-400/10 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-300">Signed in with Google</p>
              <p className="mt-1 break-all font-medium">{currentUser.email}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button disabled={loading} onClick={() => runBackupAction(onSyncRegimen)} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"><CloudUpload size={18} /> Back up to Drive</button>
              <button disabled={loading} onClick={() => runBackupAction(onRestoreRegimen)} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-semibold hover:bg-white/10 disabled:opacity-50"><CloudDownload size={18} /> Reload from Drive</button>
            </div>
            <button disabled={loading} onClick={handleSignOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"><LogOut size={17} /> Sign out</button>
          </>
        ) : (
          <button disabled={loading} onClick={handleGoogleSignIn} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-slate-900 disabled:opacity-50">
            <LogIn size={19} /> {loading ? 'Connecting to Google…' : 'Continue with Google'}
          </button>
        )}

        {loading && <p className="mt-4 text-center text-sm text-slate-400">Please wait…</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}
        <p className="mt-5 text-xs leading-5 text-slate-500">Data is automatically restored after Google sign-in and automatically backed up after edits. A local working cache remains on this device for offline resilience. The cloud key is stored alongside the encrypted data in the same Google account's private app-data area, so this is convenience-focused encryption, not protection against someone who can access both files. Google may require OAuth verification before public use.</p>
      </section>
    </div>
  );
};
