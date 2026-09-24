import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  X, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { Supplement, UserProfile } from '../types/supplement';
import { 
  getSuppleTrackCalendarEvents, 
  syncRegimenToCalendar, 
  deleteCalendarEvent,
  CalendarEventSummary 
} from '../utils/googleCalendar';
import { getCachedGoogleAccessToken, signInWithGoogle } from '../utils/googleDriveSync';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplements: Supplement[];
  profiles: UserProfile[];
  activeProfile: UserProfile;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  supplements,
  profiles,
  activeProfile,
}) => {
  const [token, setToken] = useState<string | null>(getCachedGoogleAccessToken());
  const [events, setEvents] = useState<CalendarEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ added: number; existingDeleted: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User confirmation dialog states (mandatory for Workspace API per skill!)
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);
  const [deleteEventTarget, setDeleteEventTarget] = useState<CalendarEventSummary | null>(null);

  // Selected profile to sync (defaults to active profile)
  const [selectedProfileId, setSelectedProfileId] = useState(activeProfile.id);

  useEffect(() => {
    if (isOpen) {
      const currentTok = getCachedGoogleAccessToken();
      setToken(currentTok);
      if (currentTok) {
        loadEvents(currentTok);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProfileObj = profiles.find((p) => p.id === selectedProfileId) || activeProfile;
  const eligibleSupplements = supplements.filter(
    (s) => !s.archived && (!s.profileId || s.profileId === currentProfileObj.id)
  );

  const handleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const { accessToken } = await signInWithGoogle();
      setToken(accessToken);
      await loadEvents(accessToken);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to authenticate with Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (tok: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await getSuppleTrackCalendarEvents(tok);
      setEvents(list);
    } catch (err: any) {
      if (err?.message?.includes('authorization expired') || err?.message?.includes('401')) {
        setToken(null);
      }
      setErrorMsg(err?.message || 'Could not fetch calendar events.');
    } finally {
      setLoading(false);
    }
  };

  const executeSync = async () => {
    if (!token) return;
    setConfirmSyncOpen(false);
    setSyncing(true);
    setErrorMsg(null);
    setSyncResult(null);

    try {
      const res = await syncRegimenToCalendar(
        token,
        supplements,
        currentProfileObj,
        (current, total, name) => {
          setSyncProgress({ current, total, name });
        }
      );
      setSyncResult(res);
      await loadEvents(token);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error occurred while syncing with Google Calendar.');
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const executeDelete = async (event: CalendarEventSummary) => {
    if (!token) return;
    setDeleteEventTarget(null);
    setLoading(true);
    setErrorMsg(null);

    try {
      await deleteCalendarEvent(token, event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete calendar event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                Google Calendar Integration
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Real-Time Sync
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Sync dose reminders, food timings & cycling protocols directly into your Google Calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sync Progress / Success banner */}
          {syncResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>
                  Successfully created <strong>{syncResult.added}</strong> recurring reminder events on your Google Calendar!
                </span>
              </div>
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold underline hover:text-emerald-800 dark:hover:text-emerald-200"
              >
                Open Google Calendar <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {!token ? (
            /* Auth Required State */
            <div className="text-center py-8 px-4 border border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/40 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">
                  Connect your Google Calendar
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
                  Authorize SuppleTrack to create recurring supplement reminder events with dosage instructions, food timing, and 10-minute notifications.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting with Google...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-4 h-4" />
                      Connect Google Calendar
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-stone-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Authorized via OAuth scope: <code>calendar.events</code></span>
              </div>
            </div>
          ) : (
            /* Authorized / Sync Control State */
            <div className="space-y-6">
              {/* Profile Picker for Sync */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Select Profile Regimen to Sync:
                  </span>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.relationship})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
                  <span>
                    <strong>{eligibleSupplements.length}</strong> active supplements configured for {currentProfileObj.name}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Includes dose times, food instructions & reminders
                  </span>
                </div>
              </div>

              {/* Sync Action Area */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/20">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Push Regimen to Google Calendar
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Creates daily or weekly recurring events with pop-up alarms 10 mins prior.
                  </p>
                </div>

                <button
                  onClick={() => setConfirmSyncOpen(true)}
                  disabled={syncing || eligibleSupplements.length === 0}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 shrink-0"
                >
                  {syncing ? (
                    <span className="flex items-center gap-2 justify-center">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Syncing... ({syncProgress?.current || 0}/{syncProgress?.total || eligibleSupplements.length})
                    </span>
                  ) : (
                    'Sync to Google Calendar'
                  )}
                </button>
              </div>

              {/* Existing Calendar Events on User's Calendar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    Synced SuppleTrack Events ({events.length})
                  </h4>
                  <button
                    onClick={() => loadEvents(token)}
                    disabled={loading}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                {events.length === 0 ? (
                  <div className="text-center py-6 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-400 text-xs">
                    No SuppleTrack events found on your Google Calendar yet. Tap "Sync to Google Calendar" above to create them.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-stone-900 dark:text-white truncate block">
                              {ev.summary}
                            </span>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400">
                              Recurring event with 10-min alerts
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                              title="View in Google Calendar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setDeleteEventTarget(ev)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Remove event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal for Syncing (Workspace Guideline Compliance) */}
        {confirmSyncOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-500">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-bold text-stone-900 dark:text-white text-base">
                  Confirm Calendar Sync
                </h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                This will create <strong>{eligibleSupplements.length}</strong> recurring supplement dose reminder events on your primary Google Calendar for <strong>{currentProfileObj.name}</strong>.
                Any prior SuppleTrack events for this profile will be updated to reflect current dosages.
              </p>
              <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-[11px] text-stone-600 dark:text-stone-300 space-y-1">
                <div>• Calendar: Primary Account Calendar</div>
                <div>• Notifications: Google Calendar pop-up alerts 10m before each dose</div>
                <div>• Profile: {currentProfileObj.name} ({currentProfileObj.relationship})</div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmSyncOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={executeSync}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  Yes, Sync to Calendar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Event Deletion (Workspace Guideline Compliance) */}
        {deleteEventTarget && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-500">
                <Trash2 className="w-6 h-6" />
                <h3 className="font-bold text-stone-900 dark:text-white text-base">
                  Remove Calendar Reminder?
                </h3>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                Are you sure you want to delete <strong>{deleteEventTarget.summary}</strong> from your Google Calendar?
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteEventTarget(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeDelete(deleteEventTarget)}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                >
                  Delete Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-stone-50/50 dark:bg-stone-900/40 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
            >
              Open Google Calendar <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold hover:bg-stone-300 dark:hover:bg-stone-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
