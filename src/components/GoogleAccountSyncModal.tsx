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
  UserPlus,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { getKnownGoogleAccounts, KnownGoogleAccount, addKnownGoogleAccount } from '../utils/googleDriveSync';

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
  onSignIn: (accountOrEmail?: string | KnownGoogleAccount) => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncToDrive: () => Promise<void>;
  onRestoreFromDrive: () => Promise<void>;
  onDeleteCloudBackup: () => Promise<void>;
}

export const GoogleAccountSyncModal: React.FC<GoogleAccountSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  isSyncing,
  lastSyncedTime,
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
  const [isSwitchingAccount, setIsSwitchingAccount] = useState<boolean>(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const knownAccounts = getKnownGoogleAccounts();

  if (!isOpen) return null;

  const handleSelectAccount = async (account: KnownGoogleAccount) => {
    setActionError(null);
    try {
      await onSignIn(account);
      setIsSwitchingAccount(false);
      setActionSuccess(`Signed in as ${account.name} (${account.email})`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to authenticate with selected account');
    }
  };

  const handleCustomAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setActionError('Please enter a valid Google email address');
      return;
    }
    setActionError(null);
    const newAccount: KnownGoogleAccount = {
      name: customName.trim() || customEmail.split('@')[0],
      email: customEmail.trim().toLowerCase(),
      initials: (customName.trim() || customEmail)[0].toUpperCase(),
    };
    try {
      addKnownGoogleAccount(newAccount);
      await onSignIn(newAccount);
      setCustomEmail('');
      setCustomName('');
      setShowCustomInput(false);
      setIsSwitchingAccount(false);
      setActionSuccess(`Signed in as ${newAccount.name} (${newAccount.email})`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to authenticate');
    }
  };

  const handleGooglePromptClick = async () => {
    setActionError(null);
    try {
      await onSignIn();
      setIsSwitchingAccount(false);
      setActionSuccess('Successfully connected via Google!');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to launch Google Account Chooser');
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

  const handleSignOutClick = async () => {
    try {
      await onSignOut();
      setIsSwitchingAccount(false);
      setActionSuccess('Disconnected from Google Account.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      setActionError(e?.message || 'Error signing out');
    }
  };

  // Avatar color generator based on email hash
  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-600',
      'bg-emerald-600',
      'bg-purple-600',
      'bg-rose-600',
      'bg-amber-600',
      'bg-indigo-600',
      'bg-teal-600',
      'bg-cyan-600',
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-stone-200 dark:border-stone-800 my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center p-1.5 shadow-xs border border-stone-800">
              <img src="/app-logo.png" alt="SuppleTrack" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-stone-900 dark:text-stone-100">
                Google Account Sync
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                SuppleTrack Cloud Regimen Backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Alerts */}
        {actionError && (
          <div className="mt-3.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">{actionError}</p>
            </div>
          </div>
        )}

        {actionSuccess && (
          <div className="mt-3.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Main Content */}
        <div className="py-3">
          
          {(!user || isSwitchingAccount) ? (
            /* OFFICIAL GOOGLE ACCOUNT CHOOSER (MuscleNectar Style) */
            <div className="space-y-4">
              
              <div className="text-left pt-1">
                <div className="flex items-center gap-2 mb-1">
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
                  <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Choose an account
                  </h4>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  to continue to <span className="font-semibold text-stone-800 dark:text-stone-200">SuppleTrack</span>
                </p>
              </div>

              {/* List of device accounts */}
              <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-stone-50/50 dark:bg-stone-950/40">
                {knownAccounts.map((acc) => {
                  const isCurrent = user?.email?.toLowerCase() === acc.email.toLowerCase();
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectAccount(acc)}
                      disabled={isSyncing}
                      className="w-full text-left p-3.5 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {acc.photoURL ? (
                          <img
                            src={acc.photoURL}
                            alt={acc.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-stone-200 dark:ring-stone-700"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full ${getAvatarColor(acc.email)} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                            {acc.initials || acc.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                            {acc.name}
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                            {acc.email}
                          </p>
                        </div>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 group-hover:text-stone-600 dark:group-hover:text-stone-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </button>
                  );
                })}

                {/* Use another account option */}
                <button
                  type="button"
                  onClick={() => setShowCustomInput(!showCustomInput)}
                  className="w-full text-left p-3.5 hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors flex items-center gap-3 text-stone-700 dark:text-stone-300 group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full border border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-500 dark:text-stone-400 group-hover:border-emerald-500 group-hover:text-emerald-500 transition-colors">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    Use another account
                  </span>
                </button>
              </div>

              {/* Custom Account Input Drawer */}
              {showCustomInput && (
                <form onSubmit={handleCustomAccountSubmit} className="p-3.5 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5 animate-in fade-in">
                  <p className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                    Enter any Google Account email:
                  </p>
                  <div className="space-y-1.5">
                    <input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Display Name (optional)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSyncing || !customEmail}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      Connect Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="px-3 py-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Official Google OAuth Trigger Button */}
              <div className="pt-1 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleGooglePromptClick}
                  disabled={isSyncing}
                  className="w-full py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 shadow-xs flex items-center justify-center gap-2.5 text-xs font-semibold text-stone-700 dark:text-stone-200 cursor-pointer transition active:scale-[0.99] disabled:opacity-50"
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
                  <span>Launch Google Web Authenticator</span>
                </button>

                {isSwitchingAccount && user && (
                  <button
                    type="button"
                    onClick={() => setIsSwitchingAccount(false)}
                    className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 underline pt-1 cursor-pointer"
                  >
                    Keep current account ({user.email})
                  </button>
                )}
              </div>

              {/* Privacy text matching Google standard */}
              <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center pt-2 leading-relaxed">
                Before using this app, you can review SuppleTrack's Privacy Policy and Terms of Service.
              </p>
            </div>
          ) : (
            /* SIGNED IN / CONNECTED STATE */
            <div className="space-y-4">
              
              {/* Connected User Card */}
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/80 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google Account'}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {(user.displayName || user.email || 'G').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {user.displayName || 'Google Account'}
                      </p>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                      {user.email || 'Connected'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSwitchingAccount(true)}
                  className="px-2.5 py-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-[11px] font-bold text-stone-700 dark:text-stone-300 shrink-0 cursor-pointer shadow-2xs transition"
                >
                  Switch
                </button>
              </div>

              {/* Sync Status Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Cloud Sync Active</span>
                  </div>
                  {lastSyncedTime && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">
                      {lastSyncedTime}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  {localSupplementsCount} supplements and {localLogsCount} intake logs are backed up and synced to this Google account.
                </p>
              </div>

              {/* Cloud Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSyncing ? 'Backing up...' : 'Back Up Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmAction('restore')}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-xs font-bold text-stone-800 dark:text-stone-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Restore Data</span>
                </button>
              </div>

              {/* Danger Zone / Disconnect */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setConfirmAction('delete')}
                  className="text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Cloud Backup</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOutClick}
                  className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Confirmation Modal Overlays */}
        {confirmAction === 'restore' && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200">Restore Cloud Backup?</p>
                <p className="text-amber-800 dark:text-amber-300 mt-1">
                  This will load the supplement regimen saved under <span className="font-semibold">{user?.email}</span>. Any unbacked-up changes on this device will be updated.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isSyncing}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-2xs"
              >
                {isSyncing ? 'Restoring...' : 'Yes, Restore'}
              </button>
            </div>
          </div>
        )}

        {confirmAction === 'delete' && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-rose-900 dark:text-rose-200">Delete Cloud Backup?</p>
                <p className="text-rose-800 dark:text-rose-300 mt-1">
                  This permanently removes the saved backup file from your Google cloud account. Your local device data will not be touched.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSyncing}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-2xs"
              >
                {isSyncing ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
