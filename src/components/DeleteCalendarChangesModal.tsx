import React, { useState, useEffect } from 'react';
import { 
  CalendarX, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Calendar, 
  ShieldCheck, 
  LogIn, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { Supplement } from '../types/supplement';
import { 
  isGoogleCalendarConnected, 
  signInWithGoogleCalendar, 
  findAppCalendarEvents, 
  deleteAllAppCalendarEvents, 
  AppCalendarEventItem, 
  DeleteAllCalendarResult 
} from '../utils/googleCalendar';

interface DeleteCalendarChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplements: Supplement[];
  onUpdateSupplement?: (supp: Supplement) => void;
  onBatchUpdateSupplements?: (supplements: Supplement[]) => void;
  onSuccess?: (result: { deletedCount: number; clearedLocalCount: number }) => void;
}

export const DeleteCalendarChangesModal: React.FC<DeleteCalendarChangesModalProps> = ({
  isOpen,
  onClose,
  supplements,
  onUpdateSupplement,
  onBatchUpdateSupplements,
  onSuccess,
}) => {
  const [step, setStep] = useState<'confirm' | 'scanning' | 'deleting' | 'success'>('confirm');
  const [detectedEvents, setDetectedEvents] = useState<AppCalendarEventItem[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isExpandedList, setIsExpandedList] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<DeleteAllCalendarResult | null>(null);

  const localSyncedCount = supplements.filter((s) => s.syncToGoogleCalendar || s.googleCalendarEventId).length;

  // On open, verify connection & scan calendar
  useEffect(() => {
    if (!isOpen) {
      setStep('confirm');
      setDetectedEvents([]);
      setErrorMsg(null);
      setDeleteResult(null);
      return;
    }

    const connected = isGoogleCalendarConnected();
    setIsConnected(connected);

    if (connected) {
      scanCalendar();
    }
  }, [isOpen]);

  const scanCalendar = async () => {
    try {
      setIsScanning(true);
      setErrorMsg(null);
      const res = await findAppCalendarEvents(supplements);
      setDetectedEvents(res.events);
    } catch (err: any) {
      console.warn('Scan error:', err);
      setErrorMsg('Could not scan Google Calendar. You can still proceed to delete or reset local links.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setIsConnecting(true);
      setErrorMsg(null);
      await signInWithGoogleCalendar();
      setIsConnected(true);
      await scanCalendar();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Calendar connection failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleExecuteDeleteAll = async () => {
    try {
      setStep('deleting');
      setErrorMsg(null);

      // Perform deletion across Google Calendar & local state
      const result = await deleteAllAppCalendarEvents(supplements, (updatedSupp) => {
        if (onUpdateSupplement) {
          onUpdateSupplement(updatedSupp);
        }
      });

      // If batch updater provided, execute atomic update
      if (onBatchUpdateSupplements) {
        const cleaned = supplements.map((s) => ({
          ...s,
          googleCalendarEventId: undefined,
          syncToGoogleCalendar: false,
          lastCalendarSyncAt: undefined,
        }));
        onBatchUpdateSupplements(cleaned);
      }

      setDeleteResult(result);
      setStep('success');

      if (onSuccess) {
        onSuccess({
          deletedCount: result.deletedCount,
          clearedLocalCount: result.clearedLocalCount,
        });
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMsg(err.message || 'Failed to delete events from Google Calendar.');
      setStep('confirm');
    }
  };

  // Reset local calendar links without contacting Google Calendar API
  const handleResetLocalOnly = () => {
    let clearedCount = 0;
    const cleaned = supplements.map((s) => {
      if (s.googleCalendarEventId || s.syncToGoogleCalendar) {
        clearedCount++;
        const updated = {
          ...s,
          googleCalendarEventId: undefined,
          syncToGoogleCalendar: false,
          lastCalendarSyncAt: undefined,
        };
        if (onUpdateSupplement) onUpdateSupplement(updated);
        return updated;
      }
      return s;
    });

    if (onBatchUpdateSupplements) {
      onBatchUpdateSupplements(cleaned);
    }

    setDeleteResult({
      success: true,
      deletedCount: 0,
      clearedLocalCount: clearedCount,
      deletedSummaries: [],
      errors: [],
    });
    setStep('success');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-calendar-modal-title"
    >
      <div 
        className="w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs border border-rose-200/60 dark:border-rose-900/60">
              <CalendarX className="w-6 h-6" />
            </div>
            <div>
              <h2 id="delete-calendar-modal-title" className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                Delete All Calendar Changes
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Permanently remove Supple Pulse events from Google Calendar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Confirm & Preview */}
        {step === 'confirm' && (
          <div className="space-y-4">
            {/* Warning disclosure banner */}
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Explicit User Confirmation Required</span>
              </div>
              <p className="leading-relaxed">
                This operation will <strong>permanently delete all schedule events, recurring series, and dosing reminders</strong> created by Supple Pulse on your primary Google Calendar, and reset calendar sync for all supplements in your stash.
              </p>
            </div>

            {/* Google Connection Status Bar */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {isConnected ? 'Google Calendar API Connected' : 'Google Calendar Not Connected'}
                </span>
              </div>
              {!isConnected && (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isConnecting ? 'Connecting...' : 'Connect to Scan Calendar'}</span>
                </button>
              )}
            </div>

            {/* Affected Items Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/60 p-3.5">
                <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                  Supplements in Stash
                </div>
                <div className="text-xl font-bold text-stone-900 dark:text-white mt-1">
                  {localSyncedCount}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                  with calendar sync enabled
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/60 p-3.5">
                <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center justify-between">
                  <span>Remote G-Cal Events</span>
                  {isScanning && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
                </div>
                <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {isScanning ? '...' : detectedEvents.length}
                </div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                  detected on primary calendar
                </div>
              </div>
            </div>

            {/* Detected Remote Events List */}
            {detectedEvents.length > 0 && (
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/30 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsExpandedList(!isExpandedList)}
                  className="w-full p-3 flex items-center justify-between font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-100/60 dark:hover:bg-stone-800/50 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    <span>Events to be deleted ({detectedEvents.length}):</span>
                  </span>
                  {isExpandedList ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                </button>

                {isExpandedList && (
                  <div className="max-h-48 overflow-y-auto divide-y divide-stone-200/60 dark:divide-stone-800/60 p-2 space-y-1.5 scrollbar-thin">
                    {detectedEvents.map((ev) => (
                      <div key={ev.id} className="p-2 rounded-xl bg-white dark:bg-stone-900/80 border border-stone-200/50 dark:border-stone-800/50 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-stone-900 dark:text-white truncate">
                            {ev.summary}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
                            {ev.startTime ? (
                              <span>{new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : null}
                            {ev.recurrence && <span>· Recurring Series</span>}
                            {ev.supplementName && (
                              <span className="px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
                                {ev.supplementName}
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200/60 dark:border-rose-900/60 shrink-0">
                          Delete
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
              >
                Cancel (Keep Events)
              </button>

              {!isConnected && (
                <button
                  type="button"
                  onClick={handleResetLocalOnly}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl border border-stone-200 dark:border-stone-700 transition"
                  title="Clear local sync flags without calling Google Calendar API"
                >
                  Reset Local Links Only
                </button>
              )}

              <button
                type="button"
                onClick={handleExecuteDeleteAll}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Calendar Changes</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Deleting */}
        {step === 'deleting' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-xs border border-rose-200 dark:border-rose-800">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Deleting Calendar Changes...
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                Purging all supplement events from your primary Google Calendar and resetting stash synchronization.
              </p>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="py-4 space-y-4 text-center">
            <div className="w-13 h-13 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                All Calendar Changes Deleted
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Your primary Google Calendar has been completely cleaned of Supple Pulse events.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 p-4 text-xs text-stone-700 dark:text-stone-300 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span>Google Calendar events deleted:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {deleteResult?.deletedCount || 0} events
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Supplement calendar links reset:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {deleteResult?.clearedLocalCount || 0} regimens
                </span>
              </div>
              {deleteResult && deleteResult.errors.length > 0 && (
                <div className="pt-2 border-t border-stone-200 dark:border-stone-700 text-rose-600 dark:text-rose-400 text-[11px]">
                  <span>Notes: {deleteResult.errors.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-5 py-2.5 text-xs font-bold text-white bg-stone-900 dark:bg-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 rounded-xl shadow-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
