import React, { useState } from 'react';
import { 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  LogOut, 
  Download, 
  Upload, 
  FileSpreadsheet,
  Lock,
  RefreshCw
} from 'lucide-react';
import { GoogleUser } from '../types/auth';
import { Supplement, DoseLog } from '../types/supplement';
import { signInWithGoogle, signOutGoogle } from '../utils/googleCalendar';
import { exportBackupData, importBackupData, exportLogsToCSV } from '../utils/storage';

export interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleUser?: GoogleUser | null;
  onUserChange: (user: GoogleUser | null) => void;
  onSyncRegimen: () => Promise<void>;
  onRestoreRegimen: () => Promise<void>;
  isSyncing?: boolean;
  lastSyncedTime?: string | null;
  supplements: Supplement[];
  logs: DoseLog[];
  onRefreshData?: () => void;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  googleUser,
  onUserChange,
  onSyncRegimen,
  onRestoreRegimen,
  isSyncing = false,
  lastSyncedTime,
  supplements,
  logs,
  onRefreshData,
}) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setAuthError(null);
    setActionSuccess(null);
    setIsProcessing(true);
    try {
      const { user, accessToken } = await signInWithGoogle();
      const gUser: GoogleUser = {
        id: user.uid,
        email: user.email || 'user@gmail.com',
        name: user.displayName || 'Google User',
        picture: user.photoURL || undefined,
        accessToken,
      };
      onUserChange(gUser);
      setActionSuccess('Connected to Google Account. Cloud Drive sync activated.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setAuthError(err?.message || 'Could not connect to Google Account.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setActionSuccess(null);
    try {
      await signOutGoogle();
      onUserChange(null);
      setActionSuccess('Signed out of Google.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to sign out.');
    }
  };

  const handleManualSync = async () => {
    setAuthError(null);
    setActionSuccess(null);
    try {
      await onSyncRegimen();
      setActionSuccess('Regimen backed up successfully to your private Google Drive!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to save to Google Drive.');
    }
  };

  const handleManualRestore = async () => {
    if (!window.confirm('Restore your regimen and history from Google Drive? This will refresh your current session data.')) {
      return;
    }
    setAuthError(null);
    setActionSuccess(null);
    try {
      await onRestoreRegimen();
      if (onRefreshData) onRefreshData();
      setActionSuccess('Regimen restored successfully from Google Drive!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to restore from Google Drive.');
    }
  };

  const handleExportJSON = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supple-pulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setActionSuccess('Exported regimen JSON backup file.');
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importBackupData(content);
      if (res.success) {
        if (onRefreshData) onRefreshData();
        setActionSuccess('Regimen backup successfully imported!');
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setAuthError(res.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-backup-title"
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cloud-backup-title" className="text-base sm:text-lg font-bold text-stone-900 dark:text-white font-display">
                Cloud Sync & Google Drive Backup
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                End-to-end encrypted backup in your private Google Drive AppData
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6">

          {/* Feedback banners */}
          {actionSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {authError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* Privacy & Architecture explanation */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 text-xs space-y-1.5 text-stone-600 dark:text-stone-300">
            <div className="flex items-center gap-2 text-stone-800 dark:text-stone-100 font-semibold">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Private Google Drive AppData Storage</span>
            </div>
            <p className="leading-relaxed">
              Backups are stored in your Google Drive's hidden <code className="px-1 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-mono text-[11px]">appDataFolder</code>. Files created here are isolated to Supple Pulse and completely hidden from public Drive search.
            </p>
          </div>

          {/* Google Account Status */}
          {googleUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {googleUser.picture ? (
                    <img 
                      src={googleUser.picture} 
                      alt={googleUser.name} 
                      className="w-10 h-10 rounded-full border border-stone-300 dark:border-stone-700 shrink-0 object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                      {googleUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-stone-900 dark:text-white text-sm truncate">
                        {googleUser.name}
                      </span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {googleUser.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>

              {/* Sync Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>{isSyncing ? 'Backing Up...' : 'Save Regimen to Drive'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualRestore}
                  disabled={isSyncing}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>Restore from Drive</span>
                </button>
              </div>

              {lastSyncedTime && (
                <p className="text-[11px] text-center text-stone-500 dark:text-stone-400">
                  Last synchronized today at {lastSyncedTime}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isProcessing}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl font-bold text-sm text-stone-900 bg-white hover:bg-stone-50 active:scale-[0.99] border border-stone-300 dark:border-stone-700 shadow-xs flex items-center justify-center gap-3 transition cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isProcessing ? 'Connecting...' : 'Sign In with Google'}</span>
              </button>

              <p className="text-[11px] text-center text-stone-500 dark:text-stone-400">
                Enables continuous background cloud backups across devices.
              </p>
            </div>
          )}

          {/* Offline / Medical Backups */}
          <div className="pt-4 border-t border-stone-200/80 dark:border-stone-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Offline Files & Physician Export
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleExportJSON}
                className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>Export JSON</span>
              </button>

              <label className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => exportLogsToCSV(logs, supplements)}
                className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-800/40 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-900 text-xs font-bold hover:bg-stone-800 dark:hover:bg-stone-100 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
