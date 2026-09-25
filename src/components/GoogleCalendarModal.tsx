import React, { useState, useEffect } from 'react';
import { Supplement } from '../types/supplement';
import { UserProfile } from '../types/profile';
import { 
  Calendar, 
  CalendarCheck, 
  Clock, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  Info,
  CalendarDays,
  Bell
} from 'lucide-react';
import { 
  generateDoseEventProposals, 
  syncDosesToCalendar, 
  SyncDosePlan 
} from '../utils/googleCalendarSync';
import { getOAuthAccessToken, signInWithGoogle } from '../utils/googleDriveSync';
import { playSuccessChime, triggerHaptic } from '../utils/soundEffects';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplements: Supplement[];
  profiles: UserProfile[];
  userEmail?: string | null;
  onRefreshAuthState?: () => void;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  supplements,
  profiles,
  userEmail,
  onRefreshAuthState,
}) => {
  const [daysAhead, setDaysAhead] = useState<number>(7);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [syncResult, setSyncResult] = useState<{ count: number; errorCount: number; message: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Generate event preview
  const plans: SyncDosePlan[] = React.useMemo(() => {
    return generateDoseEventProposals(supplements, profiles, daysAhead);
  }, [supplements, profiles, daysAhead]);

  if (!isOpen) return null;

  const handleStartSyncFlow = () => {
    const token = getOAuthAccessToken();
    if (!token && !userEmail) {
      setAuthError('Please sign in with your Google Account first to authorize Google Calendar.');
      return;
    }
    setAuthError(null);
    setShowConfirmation(true);
  };

  const handleConfirmSync = async () => {
    setShowConfirmation(false);
    setIsSyncing(true);
    setSyncResult(null);
    setAuthError(null);

    try {
      let token = getOAuthAccessToken();
      if (!token) {
        // Re-authenticate if token lost
        const res = await signInWithGoogle();
        token = res.accessToken;
        if (onRefreshAuthState) onRefreshAuthState();
      }

      if (!token) {
        throw new Error('Google Calendar authorization token not found. Please click Sign in with Google.');
      }

      setSyncProgress({ current: 0, total: plans.length });

      const result = await syncDosesToCalendar(token, plans, (current, total) => {
        setSyncProgress({ current, total });
      });

      triggerHaptic('success');
      playSuccessChime();

      setSyncResult({
        count: result.createdCount,
        errorCount: result.errors.length,
        message: result.errors.length === 0
          ? `Successfully scheduled ${result.createdCount} supplement reminder events on your Google Calendar!`
          : `Created ${result.createdCount} events with ${result.errors.length} notices.`,
      });
    } catch (err: any) {
      triggerHaptic('medium');
      setAuthError(err.message || 'Failed to sync with Google Calendar.');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-stone-50 to-stone-50 dark:from-blue-950/20 dark:via-stone-900 dark:to-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-syne text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Google Calendar Sync
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Workspace
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sync scheduled supplement doses directly to your Google Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Account & Permission Banner */}
          <div className="p-4 rounded-2xl bg-stone-100 dark:bg-[#231f1c] border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
                G
              </div>
              <div>
                <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">Google Account</p>
                <p className="text-sm font-bold text-stone-900 dark:text-white">
                  {userEmail || 'Not Connected (Sign in below)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5 transition"
              >
                <span>Open Google Calendar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Sync Success / Result Toast */}
          {syncResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-start gap-3 animate-fadeIn">
              <CalendarCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Synchronization Complete</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {syncResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Calendar Notice</h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  {authError}
                </p>
              </div>
            </div>
          )}

          {/* Schedule Config Range */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>Dose Horizon to Schedule</span>
            </label>
            <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
              {[3, 7, 14, 30].map(days => (
                <button
                  key={days}
                  onClick={() => setDaysAhead(days)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    daysAhead === days
                      ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          {/* Preview of Events to be Created */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                Scheduled Events Preview ({plans.length} upcoming doses)
              </span>
              <span>Sorted by timing & profile</span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 bg-stone-50/50 dark:bg-stone-900/50">
              {plans.length === 0 ? (
                <p className="text-xs text-center py-6 text-stone-400">
                  No active supplements scheduled for this period.
                </p>
              ) : (
                plans.slice(0, 15).map((plan, idx) => (
                  <div
                    key={`${plan.supplement.id}-${plan.dateStr}-${idx}`}
                    className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: plan.profile.accentColor }} />
                      <div>
                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                          {plan.supplement.name}
                        </span>
                        <span className="ml-1.5 text-stone-400 dark:text-stone-400">
                          ({plan.supplement.doseAmount} {plan.supplement.unit})
                        </span>
                        <span className="ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                          {plan.profile.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-stone-500 dark:text-stone-400">
                      <span>{plan.dateStr}</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">{plan.timeStr}</span>
                    </div>
                  </div>
                ))
              )}
              {plans.length > 15 && (
                <p className="text-[11px] text-center text-stone-400 py-1">
                  + {plans.length - 15} additional scheduled doses
                </p>
              )}
            </div>
          </div>

          {/* Sync Progress Bar */}
          {syncProgress && (
            <div className="space-y-1.5 animate-fadeIn">
              <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Syncing doses to Google Calendar...</span>
                <span>{syncProgress.current} / {syncProgress.total}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Confirmation Dialog (Mandatory for Workspace Integration) */}
          {showConfirmation && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border-2 border-blue-500/40 text-blue-950 dark:text-blue-100 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span>Confirm Google Calendar Synchronization</span>
              </div>
              <p className="text-xs text-blue-900/80 dark:text-blue-200/80">
                Are you sure you want to add <strong>{plans.length}</strong> supplement dose reminder events to your primary Google Calendar ({userEmail})?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmSync}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                >
                  Yes, Add Events to Google Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="px-3 py-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-100 dark:bg-[#231f1c] border-t border-stone-200 dark:border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 font-medium">
            <Bell className="w-3.5 h-3.5 text-blue-500" />
            <span>Includes 10-minute pop-up reminders</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900"
            >
              Close
            </button>
            <button
              onClick={handleStartSyncFlow}
              disabled={isSyncing || plans.length === 0}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center gap-2 shadow-sm"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4" />
                  <span>Sync {plans.length} Doses to Google Calendar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
