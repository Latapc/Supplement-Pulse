import React, { useState } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  DownloadCloud, 
  UploadCloud, 
  Trash2, 
  LogOut, 
  X, 
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { User } from 'firebase/auth';
import { CloudRegimenData } from '../utils/googleDriveSync';

interface GoogleAccountSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  hasDriveAccess: boolean;
  isSyncing: boolean;
  lastSyncedTime: string | null;
  cloudFileId: string | null;
  localSupplementsCount: number;
  localLogsCount: number;
  onSignIn: (email?: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncToDrive: () => Promise<void>;
  onRestoreFromDrive: () => Promise<void>;
  onDeleteCloudBackup: () => Promise<void>;
}

export const GoogleAccountSyncModal: React.FC<GoogleAccountSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  hasDriveAccess,
  isSyncing,
  lastSyncedTime,
  cloudFileId,
  localSupplementsCount,
  localLogsCount,
  onSignIn,
  onSignOut,
  onSyncToDrive,
  onRestoreFromDrive,
  onDeleteCloudBackup,
}) => {
  const [confirmAction, setConfirmAction] = useState<'restore' | 'delete' | 'overwrite' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [showManualEmail, setShowManualEmail] = useState(false);

  if (!isOpen) return null;

  const handleSignInClick = async (emailOverride?: string) => {
    setActionError(null);
    try {
      await onSignIn(emailOverride || (customEmail.trim() ? customEmail.trim() : undefined));
      setActionSuccess('Successfully connected to your Google Account!');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to authenticate with Google');
    }
  };

  const handleSyncClick = async () => {
    setActionError(null);
    try {
      await onSyncToDrive();
      setActionSuccess('Data successfully backed up to your Google Account cloud!');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err?.message || 'Sync failed');
    }
  };

  const handleConfirmRestore = async () => {
    setActionError(null);
    try {
      await onRestoreFromDrive();
      setConfirmAction(null);
      setActionSuccess('Latest regimen data loaded from your Google cloud profile!');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to restore data from Google cloud');
    }
  };

  const handleConfirmDelete = async () => {
    setActionError(null);
    try {
      await onDeleteCloudBackup();
      setConfirmAction(null);
      setActionSuccess('Cloud backup removed from your Google profile.');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete backup file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full flex items-start justify-center p-3 sm:p-6 py-4 sm:py-8">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-stone-900">
                Google Account Cloud Sync
              </h3>
              <p className="text-xs text-stone-500">
                Automatic synchronization with your Google Account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Alerts */}
        {actionError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Sync error</p>
              <p className="mt-0.5 text-rose-700">{actionError}</p>
            </div>
          </div>
        )}

        {actionSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Body */}
        <div className="py-4 space-y-4">
          
          {!user ? (
            /* Not signed in */
            <div className="text-center py-4 space-y-4">
              <div className="max-w-sm mx-auto text-xs text-stone-600 space-y-2">
                <p>
                  Connect your Google Account to automatically sync all your supplement regimens, past dosage logs, and inventory balances to the cloud.
                </p>
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-left space-y-1.5 text-[11px] text-stone-600">
                  <div className="flex items-center gap-2 text-stone-800 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Seamless Cloud Synchronization</span>
                  </div>
                  <p>• Data automatically syncs across your devices and browser sessions.</p>
                  <p>• Stored safely under your private Google Account authentication.</p>
                  <p>• Instant backup and one-click restoration anytime.</p>
                </div>
              </div>

              {/* One-Tap Google Connect Option */}
              <div className="pt-2 flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSignInClick('neelamtiwari81976@gmail.com')}
                  disabled={isSyncing}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 active:bg-emerald-200 shadow-xs transition-all text-xs font-bold text-emerald-950 dark:text-emerald-100 disabled:opacity-50 cursor-pointer w-full justify-center max-w-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                  <span>Connect neelamtiwari81976@gmail.com</span>
                </button>

                <div className="flex items-center gap-2 w-full max-w-xs my-0.5">
                  <div className="h-px bg-stone-200 dark:bg-stone-700 flex-1"></div>
                  <span className="text-[10px] text-stone-500 font-medium uppercase">or switch account</span>
                  <div className="h-px bg-stone-200 dark:bg-stone-700 flex-1"></div>
                </div>

                {!showManualEmail ? (
                  <div className="flex items-center gap-2 w-full max-w-xs justify-center">
                    <button
                      type="button"
                      onClick={() => handleSignInClick()}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 shadow-2xs text-xs font-medium text-stone-700 dark:text-stone-200 cursor-pointer"
                    >
                      <span>Popup Sign In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualEmail(true)}
                      className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-stone-50 cursor-pointer"
                    >
                      Enter other Gmail
                    </button>
                  </div>
                ) : (
                  <div className="w-full max-w-xs space-y-2 pt-1 animate-fadeIn">
                    <input
                      type="email"
                      placeholder="e.g. yourname@gmail.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-hidden focus:border-emerald-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSignInClick(customEmail.trim() || 'neelamtiwari81976@gmail.com')}
                      disabled={isSyncing}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      Connect & Sync Cloud Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Signed in */
            <div className="space-y-4">
              
              {/* Account profile card */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Google Account'} 
                      className="w-10 h-10 rounded-full border border-stone-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                      {(user.displayName || user.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 leading-tight">
                      {user.displayName || 'Google User'}
                    </h4>
                    <p className="text-xs text-stone-500 font-mono">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSignOut}
                  title="Disconnect Google Account"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-xl transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Cloud Sync State */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-950 font-display">
                      {isSyncing ? 'Syncing to Google Drive...' : 'Google Drive Sync Active'}
                    </span>
                  </div>

                  {lastSyncedTime && (
                    <span className="text-[11px] text-emerald-800">
                      Last synced: {lastSyncedTime}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 text-xs text-emerald-900/80 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Target file: <strong className="font-mono text-emerald-950">suppletrack_data.json</strong></span>
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Local active: {localSupplementsCount} supplements · {localLogsCount} dosage logs
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                
                {/* Sync to Drive */}
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now (Upload)'}</span>
                </button>

                {/* Restore from Drive */}
                <button
                  type="button"
                  onClick={() => setConfirmAction('restore')}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs transition disabled:opacity-50"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Restore from Drive</span>
                </button>

              </div>

              {/* Re-authenticate button if token expired */}
              {!hasDriveAccess && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                  <span>Session needs Google Drive refresh</span>
                  <button
                    type="button"
                    onClick={() => handleSignInClick()}
                    className="font-bold underline text-amber-900 cursor-pointer"
                  >
                    Authorize Drive
                  </button>
                </div>
              )}

              {/* Danger Zone: Delete Cloud File */}
              {cloudFileId && (
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span>Drive file ID: {cloudFileId.slice(0, 10)}...</span>
                  <button
                    type="button"
                    onClick={() => setConfirmAction('delete')}
                    className="text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Cloud File</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

        {/* User Confirmation Dialog for Destructive Operations (Required by Workspace Integration) */}
        {confirmAction && (
          <div className="mt-4 p-4 rounded-2xl bg-stone-900 text-white space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  {confirmAction === 'restore'
                    ? 'Restore Data from Google Drive?'
                    : 'Delete Cloud Backup File?'}
                </h4>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                  {confirmAction === 'restore'
                    ? 'This will load your saved supplements, inventory balances, and intake logs from Google Drive, updating your local browser storage. Any unsynced local changes will be replaced.'
                    : 'This will permanently remove the suppletrack_data.json backup file from your Google Drive. Your local browser data will remain untouched.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 text-xs text-stone-300 hover:text-white rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction === 'restore' ? handleConfirmRestore : handleConfirmDelete}
                className={`px-4 py-1.5 text-xs font-semibold rounded-xl text-white shadow-xs transition ${
                  confirmAction === 'restore'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {confirmAction === 'restore' ? 'Confirm Restore' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs text-stone-500">
          <span>Synced with Google Workspace APIs</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </div>
  );
};
