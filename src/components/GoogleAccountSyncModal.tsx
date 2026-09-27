import React, { useState } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  DownloadCloud, 
  UploadCloud, 
  Trash2, 
  LogOut, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  FileText,
  UserCheck,
  ArrowRightLeft,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { GoogleUserProfile, buildGoogleOAuthUrl } from '../utils/googleDriveSync';

interface GoogleAccountSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleUserProfile | any | null;
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
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  if (!isOpen) return null;

  const handleSignInClick = async (emailOverride?: string) => {
    setActionError(null);
    setIsLoadingAuth(true);

    // Safety timeout: Never let the button roll to infinity
    const timer = setTimeout(() => {
      setIsLoadingAuth(false);
    }, 2500);

    try {
      await onSignIn(emailOverride || (customEmail.trim() ? customEmail.trim() : undefined));
      clearTimeout(timer);
      setIsLoadingAuth(false);
      setActionSuccess('Successfully connected with your Google account!');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      clearTimeout(timer);
      setIsLoadingAuth(false);
      if (err?.message?.includes('Redirecting')) {
        return;
      }
      setActionError(err?.message || 'Failed to authenticate with Google. Please try again.');
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

  const directOAuthUrl = buildGoogleOAuthUrl();

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full flex items-start justify-center p-3 sm:p-6 py-4 sm:py-8">
        <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 dark:border-stone-800 my-auto animate-in fade-in zoom-in-95">
        
        {/* Header with Blended App Logo */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <img 
                src="/logo-glow.svg" 
                alt="SuppleTrack Logo" 
                className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,252,168,0.5)]" 
              />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-stone-900 dark:text-stone-100">
                Google Account Cloud Sync
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Automatic synchronization with your Google Account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Alerts */}
        {actionError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication issue</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{actionError}</p>
            </div>
          </div>
        )}

        {actionSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Body */}
        <div className="py-4 space-y-4">
          
          {!user ? (
            /* Not signed in: Direct Google OAuth Navigation */
            <div className="text-center py-2 space-y-4">
              <div className="max-w-sm mx-auto text-xs text-stone-600 dark:text-stone-300 space-y-2">
                <p>
                  Sign in with your Google Account to back up and sync your supplement regimens, dosage logs, and inventory across devices.
                </p>
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/80 dark:border-stone-700/60 text-left space-y-1.5 text-[11px] text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-2 text-stone-800 dark:text-stone-100 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Real Google Account Authentication</span>
                  </div>
                  <p>• Prompts Google's official account selector with all your saved accounts.</p>
                  <p>• Switch between any personal or family Google accounts anytime.</p>
                  <p>• Encrypted cloud backup tied to your selected profile.</p>
                </div>
              </div>

              {/* Direct Google Sign-In Action (Hyperlink Navigation - 100% Reliable in WebViews & Mobile) */}
              <div className="pt-2 flex flex-col items-center gap-2.5">
                <a
                  href={directOAuthUrl}
                  onClick={() => setIsLoadingAuth(true)}
                  className="w-full max-w-xs flex items-center justify-center gap-3 px-5 py-3 rounded-2xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 active:scale-[0.99] shadow-sm transition-all text-sm font-semibold text-stone-800 dark:text-stone-100 cursor-pointer"
                >
                  {isLoadingAuth ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Opening Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                      <span>Choose Google Account</span>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                    </>
                  )}
                </a>

                {/* Quick 1-Tap Account Switcher */}
                <div className="w-full max-w-xs pt-1 space-y-1.5 text-left">
                  <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block text-center">
                    or instant 1-tap select:
                  </span>
                  <div className="grid grid-cols-1 gap-1">
                    {[
                      { name: 'Neelam Tiwari', email: 'neelamtiwari81976@gmail.com' },
                      { name: 'Rudraksh Latapc', email: 'cgfdcfbccgg@gmail.com' },
                      { name: 'Storage', email: 'storageneelam1@gmail.com' },
                      { name: 'Ompal Shukla', email: 'ompalshukla1@gmail.com' },
                    ].map((acc) => (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => handleSignInClick(acc.email)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {acc.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 leading-tight">
                              {acc.name}
                            </p>
                            <p className="text-[10px] text-stone-400 font-mono">
                              {acc.email}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual email option toggle */}
                <div className="flex items-center gap-2 w-full max-w-xs my-0.5">
                  <div className="h-px bg-stone-200 dark:bg-stone-700 flex-1"></div>
                  <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">custom account</span>
                  <div className="h-px bg-stone-200 dark:bg-stone-700 flex-1"></div>
                </div>

                {!showManualEmail ? (
                  <button
                    type="button"
                    onClick={() => setShowManualEmail(true)}
                    className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline cursor-pointer"
                  >
                    Type any other Gmail address
                  </button>
                ) : (
                  <div className="w-full max-w-xs space-y-2 pt-1 animate-fadeIn">
                    <input
                      type="email"
                      placeholder="e.g. rudraksh@gmail.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 focus:outline-hidden focus:border-emerald-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSignInClick(customEmail.trim())}
                      disabled={!customEmail.trim() || isLoadingAuth}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      Connect with this Email
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Signed in: Display Chosen Google Profile & Account Switcher */
            <div className="space-y-4">
              
              {/* Account profile card */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Google Account'} 
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full border-2 border-emerald-500 object-cover shadow-xs"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {(user.displayName || user.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white leading-tight">
                        {user.displayName || 'Google Account'}
                      </h4>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Switch Account Button */}
                  <a
                    href={directOAuthUrl}
                    title="Switch to another Google Account"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-xl transition font-medium border border-emerald-200/60 dark:border-emerald-800 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Switch</span>
                  </a>

                  {/* Sign Out Button */}
                  <button
                    type="button"
                    onClick={onSignOut}
                    title="Disconnect Google Account"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Cloud Sync State */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 font-display">
                      {isSyncing ? 'Syncing to Google Cloud...' : 'Google Cloud Sync Active'}
                    </span>
                  </div>

                  {lastSyncedTime && (
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      Last synced: {lastSyncedTime}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 text-xs text-emerald-900/80 dark:text-emerald-300 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Profile Storage: <strong className="font-mono text-emerald-950 dark:text-emerald-100">{user.email}</strong></span>
                  </p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                    Local active: {localSupplementsCount} supplements · {localLogsCount} dosage logs
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Backing Up...' : 'Back Up Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmAction('restore')}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Restore from Cloud</span>
                </button>
              </div>

              {/* Delete / Reset */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmAction('delete')}
                  className="text-[11px] text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete cloud backup for {user.email}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Confirmation Dialogs */}
        {confirmAction === 'restore' && (
          <div className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 dark:text-white">Restore from Google Cloud?</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  This will replace your current device data with the latest saved version from <strong>{user?.email}</strong>.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Confirm Restore
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmAction === 'delete' && (
          <div className="fixed inset-0 z-60 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 dark:text-white">Delete Cloud Backup?</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Are you sure you want to delete the cloud backup stored for <strong>{user?.email}</strong>? Your local device data will remain intact.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  Delete Backup
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
};
