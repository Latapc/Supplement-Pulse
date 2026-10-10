import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  Download, 
  Filter, 
  Check, 
  Plus, 
  ShieldCheck, 
  LogOut,
  Pill,
  Utensils,
  Repeat,
  Info
} from 'lucide-react';
import { Supplement, DoseLog, DayOfWeek } from '../types/supplement';
import { 
  formatDateToYYYYMMDD, 
  parseYYYYMMDD, 
  isScheduledOnDate, 
  getCyclePhase, 
  getCourseStatus, 
  getDayName, 
  getDayShortName 
} from '../utils/dates';
import { 
  subscribeGoogleAuth, 
  signInWithGoogleCalendar, 
  signOutGoogleCalendar, 
  syncSupplementToGoogleCalendar, 
  generateGoogleCalendarWebUrl, 
  downloadICalFile 
} from '../utils/googleCalendar';
import { User } from 'firebase/auth';

interface SupplementCalendarViewProps {
  supplements: Supplement[];
  logs: DoseLog[];
  currentDate?: Date;
  initialSelectedSupplementId?: string;
  onOpenEditModal?: (supplement: Supplement) => void;
  onQuickLog?: (supplement: Supplement, amount?: number, notes?: string) => void;
  onUpdateSupplement?: (supplement: Supplement) => void;
}

export const SupplementCalendarView: React.FC<SupplementCalendarViewProps> = ({
  supplements,
  logs,
  currentDate = new Date(),
  initialSelectedSupplementId = 'all',
  onOpenEditModal,
  onQuickLog,
  onUpdateSupplement,
}) => {
  const [selectedSuppId, setSelectedSuppId] = useState<string>(initialSelectedSupplementId);
  const [viewDate, setViewDate] = useState<Date>(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const [selectedDayStr, setSelectedDayStr] = useState<string>(formatDateToYYYYMMDD(currentDate));
  
  // Google Auth & Sync States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [syncingSuppId, setSyncingSuppId] = useState<string | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Destructive / Confirmation Dialog State (MANDATORY per Workspace integration guidelines)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: 'Confirm',
    onConfirm: () => {},
  });

  // Keep selectedSuppId in sync if prop changes
  useEffect(() => {
    if (initialSelectedSupplementId) {
      setSelectedSuppId(initialSelectedSupplementId);
    }
  }, [initialSelectedSupplementId]);

  // Subscribe to Google Auth state
  useEffect(() => {
    const unsubscribe = subscribeGoogleAuth((user, token) => {
      setGoogleUser(user);
      setHasGoogleToken(!!token);
    });
    return () => unsubscribe();
  }, []);

  const selectedSupplement = useMemo(() => {
    if (selectedSuppId === 'all') return null;
    return supplements.find((s) => s.id === selectedSuppId) || null;
  }, [supplements, selectedSuppId]);

  // Calendar month navigation
  const prevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDayStr(formatDateToYYYYMMDD(now));
  };

  // Month grid generation
  const monthData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      isFuture: boolean;
      scheduledSupplements: Array<{
        supplement: Supplement;
        isTaken: boolean;
        amountTaken: number;
        scheduledTime?: string;
        isCyclicOff?: boolean;
      }>;
    }> = [];

    const todayStr = formatDateToYYYYMMDD(currentDate);

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      const str = formatDateToYYYYMMDD(d);
      days.push({
        date: d,
        dateStr: str,
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isPast: str < todayStr,
        isFuture: str > todayStr,
        scheduledSupplements: [],
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = formatDateToYYYYMMDD(dateObj);
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;

      const scheduledSupps: Array<{
        supplement: Supplement;
        isTaken: boolean;
        amountTaken: number;
        scheduledTime?: string;
        isCyclicOff?: boolean;
      }> = [];

      supplements.forEach((supp) => {
        // If filtering by specific supplement (e.g. Vitamin D3)
        if (selectedSuppId !== 'all' && supp.id !== selectedSuppId) {
          return;
        }

        const isScheduled = isScheduledOnDate(supp, dateObj);
        const dayLogs = logs.filter((l) => l.supplementId === supp.id && l.date === dateStr);
        const totalTaken = dayLogs.reduce((acc, l) => acc + l.amountTaken, 0);
        const isTaken = totalTaken >= supp.doseAmount || dayLogs.length > 0;

        // Check if in cyclic rest
        let isCyclicOff = false;
        if (supp.cycleConfig?.isCyclic) {
          const phase = getCyclePhase(supp, dateObj);
          if (phase && !phase.inActivePhase) {
            isCyclicOff = true;
          }
        }

        if (isScheduled || isTaken) {
          scheduledSupps.push({
            supplement: supp,
            isTaken,
            amountTaken: totalTaken,
            scheduledTime: supp.doseTime || '09:00',
            isCyclicOff,
          });
        }
      });

      days.push({
        date: dateObj,
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday,
        isPast,
        isFuture,
        scheduledSupplements: scheduledSupps,
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      const str = formatDateToYYYYMMDD(d);
      days.push({
        date: d,
        dateStr: str,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: str === todayStr,
        isPast: str < todayStr,
        isFuture: str > todayStr,
        scheduledSupplements: [],
      });
    }

    return days;
  }, [viewDate, supplements, logs, selectedSuppId, currentDate]);

  // Statistics for selected supplement or overall month
  const monthStats = useMemo(() => {
    let totalScheduledDays = 0;
    let totalTakenDays = 0;

    monthData.forEach((day) => {
      if (!day.isCurrentMonth) return;
      if (day.scheduledSupplements.length > 0) {
        totalScheduledDays++;
        if (day.scheduledSupplements.some((s) => s.isTaken)) {
          totalTakenDays++;
        }
      }
    });

    const totalDaysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const percentAdherence = totalScheduledDays > 0 
      ? Math.round((totalTakenDays / totalScheduledDays) * 100) 
      : 100;

    return {
      totalScheduledDays,
      totalTakenDays,
      totalDaysInMonth,
      percentAdherence,
    };
  }, [monthData, viewDate]);

  // Selected Day Details
  const selectedDayData = useMemo(() => {
    return monthData.find((d) => d.dateStr === selectedDayStr) || null;
  }, [monthData, selectedDayStr]);

  // Handle Google Calendar Sign In
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setSyncStatusMsg(null);
      await signInWithGoogleCalendar();
      setSyncStatusMsg({
        text: 'Connected Google Calendar successfully! Ready to sync dosing events.',
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
      setSyncStatusMsg({
        text: err.message || 'Failed to connect Google Calendar. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Google Calendar Sign Out
  const handleGoogleSignOut = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Disconnect Google Calendar?',
      description: 'This will unlink your Google Calendar session. Your supplement data in Supple Pulse will remain completely safe.',
      actionLabel: 'Disconnect',
      onConfirm: async () => {
        await signOutGoogleCalendar();
        setSyncStatusMsg({ text: 'Disconnected from Google Calendar.', type: 'info' });
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Sync a single supplement to Google Calendar
  const handleSyncSupplement = async (supp: Supplement) => {
    if (!hasGoogleToken) {
      // Prompt sign in first
      await handleGoogleSignIn();
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Sync ${supp.name} to Google Calendar?`,
      description: `Supple Pulse will create/update a recurring calendar event "Take ${supp.name} (${supp.doseAmount} ${supp.unit})" at ${supp.doseTime || '09:00'} on your primary Google Calendar, with reminder alerts.`,
      actionLabel: 'Confirm & Sync',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setSyncingSuppId(supp.id);
          setSyncStatusMsg(null);
          const result = await syncSupplementToGoogleCalendar(supp);

          const updatedSupp: Supplement = {
            ...supp,
            syncToGoogleCalendar: true,
            googleCalendarEventId: result.eventId,
            lastCalendarSyncAt: new Date().toISOString(),
          };

          if (onUpdateSupplement) {
            onUpdateSupplement(updatedSupp);
          }

          setSyncStatusMsg({
            text: `Successfully synced ${supp.name} to Google Calendar!`,
            type: 'success',
          });
        } catch (err: any) {
          console.error(err);
          setSyncStatusMsg({
            text: `Calendar sync error: ${err.message || 'Failed to update Google Calendar'}`,
            type: 'error',
          });
        } finally {
          setSyncingSuppId(null);
        }
      },
    });
  };

  // Sync All Active Regimens
  const handleSyncAllRegimens = async () => {
    if (!hasGoogleToken) {
      await handleGoogleSignIn();
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Sync All Active Supplements to Google Calendar?',
      description: `Supple Pulse will schedule recurring calendar events for all ${supplements.length} active supplements in your stash, with dosages, timing windows, and intake reminders.`,
      actionLabel: 'Sync All Regimens',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setSyncingSuppId('all');
          let count = 0;
          for (const supp of supplements) {
            const res = await syncSupplementToGoogleCalendar(supp);
            if (onUpdateSupplement) {
              onUpdateSupplement({
                ...supp,
                syncToGoogleCalendar: true,
                googleCalendarEventId: res.eventId,
                lastCalendarSyncAt: new Date().toISOString(),
              });
            }
            count++;
          }
          setSyncStatusMsg({
            text: `Successfully synced ${count} supplement regimens to your Google Calendar!`,
            type: 'success',
          });
        } catch (err: any) {
          setSyncStatusMsg({
            text: `Batch sync error: ${err.message}`,
            type: 'error',
          });
        } finally {
          setSyncingSuppId(null);
        }
      },
    });
  };

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      
      {/* Confirmation Dialog Modal (Destructive Operations / API Mutations) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Google Calendar Workspace Integration
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl shadow-xs transition"
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner: Google Calendar Workspace Status Bar */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <span>Google Calendar Sync Hub</span>
                {hasGoogleToken && (
                  <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Connected
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {hasGoogleToken && googleUser
                ? `Logged in as ${googleUser.email || googleUser.displayName}. Supplement schedules sync automatically.`
                : 'Connect your Google account to automatically schedule dosing reminders and recurring calendar alerts.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasGoogleToken ? (
            <>
              <button
                type="button"
                onClick={handleSyncAllRegimens}
                disabled={syncingSuppId === 'all'}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingSuppId === 'all' ? 'animate-spin' : ''}`} />
                <span>{syncingSuppId === 'all' ? 'Syncing All...' : 'Sync All Stash to Calendar'}</span>
              </button>

              <button
                type="button"
                onClick={handleGoogleSignOut}
                title="Disconnect Google Calendar"
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="px-4 py-2 text-xs font-bold text-stone-800 dark:text-white bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-[0.98] rounded-xl border border-stone-300 dark:border-stone-700 transition flex items-center gap-2 shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncStatusMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border animate-in fade-in ${
          syncStatusMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : syncStatusMsg.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            : 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
        }`}>
          <span>{syncStatusMsg.text}</span>
          <button 
            onClick={() => setSyncStatusMsg(null)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Supplement Filter Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 font-semibold px-1">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-stone-500" />
            <span>Filter Calendar by Supplement:</span>
          </span>
          {selectedSupplement && (
            <span className="text-[11px] text-blue-600 dark:text-blue-400">
              Showing exact scheduled intake days for {selectedSupplement.name}
            </span>
          )}
        </div>

        {/* Scrollable Supplement Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedSuppId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              selectedSuppId === 'all'
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
            }`}
          >
            All Supplements ({supplements.length})
          </button>

          {supplements.map((supp) => {
            const isSelected = selectedSuppId === supp.id;
            return (
              <button
                key={supp.id}
                type="button"
                onClick={() => setSelectedSuppId(supp.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-300 dark:ring-blue-800'
                    : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  supp.category === 'vitamins' ? 'bg-amber-400' : supp.category === 'minerals' ? 'bg-indigo-400' : 'bg-emerald-400'
                }`} />
                <span>{supp.name}</span>
                {supp.syncToGoogleCalendar && (
                  <span className="text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded-sm">
                    G-Cal
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Supplement Banner (e.g. Vitamin D3 highlight) */}
      {selectedSupplement && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <span>{selectedSupplement.name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {selectedSupplement.doseAmount.toLocaleString()} {selectedSupplement.unit}
                  </span>
                </h4>
                <div className="text-xs text-stone-600 dark:text-stone-300 flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="capitalize">{selectedSupplement.frequencyType}</span>
                  <span>·</span>
                  <span>{selectedSupplement.doseTime || '09:00'}</span>
                  {selectedSupplement.foodTiming && (
                    <>
                      <span>·</span>
                      <span className="capitalize">{selectedSupplement.foodTiming.replace(/_/g, ' ')}</span>
                    </>
                  )}
                  {selectedSupplement.cycleConfig?.isCyclic && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                      Cycle: {selectedSupplement.cycleConfig.onDays}d ON / {selectedSupplement.cycleConfig.offDays}d OFF
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleSyncSupplement(selectedSupplement)}
                disabled={syncingSuppId === selectedSupplement.id}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingSuppId === selectedSupplement.id ? 'animate-spin' : ''}`} />
                <span>{selectedSupplement.googleCalendarEventId ? 'Update on Google Calendar' : 'Put into Google Calendar'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = generateGoogleCalendarWebUrl(selectedSupplement);
                  window.open(url, '_blank');
                }}
                title="Open directly in Google Calendar Web"
                className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl transition flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Web Link</span>
              </button>

              <button
                type="button"
                onClick={() => downloadICalFile(selectedSupplement)}
                title="Download iCalendar .ics file"
                className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl transition flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">.ICS</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-blue-900 dark:text-blue-200 bg-white/70 dark:bg-stone-900/60 p-2.5 rounded-xl border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between">
            <span>
              Scheduled on <strong>{monthStats.totalScheduledDays} of {monthStats.totalDaysInMonth} days</strong> this month ({monthStats.percentAdherence}% adherence logged so far).
            </span>
            {onOpenEditModal && (
              <button
                type="button"
                onClick={() => onOpenEditModal(selectedSupplement)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Edit Dosing Schedule
              </button>
            )}
          </div>
        </div>
      )}

      {/* Calendar Header: Month, Year, Navigation */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white font-display">
              {monthName}
            </h3>
            <span className="text-xs text-stone-500 font-medium hidden sm:inline">
              ({monthStats.totalScheduledDays} scheduled dose days)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl transition cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={prevMonth}
              title="Previous Month"
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              title="Next Month"
              className="p-1.5 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 text-center text-xs font-bold text-stone-600 dark:text-stone-400 py-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-stone-100 dark:divide-stone-800">
          {monthData.map((day) => {
            const isSelected = day.dateStr === selectedDayStr;
            const hasScheduled = day.scheduledSupplements.length > 0;
            const allTaken = hasScheduled && day.scheduledSupplements.every((s) => s.isTaken);
            const partiallyTaken = hasScheduled && !allTaken && day.scheduledSupplements.some((s) => s.isTaken);

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDayStr(day.dateStr)}
                className={`min-h-[78px] sm:min-h-[96px] p-1.5 sm:p-2 flex flex-col justify-between text-left transition-colors relative cursor-pointer ${
                  !day.isCurrentMonth
                    ? 'bg-stone-50/30 dark:bg-stone-900/30 text-stone-300 dark:text-stone-700'
                    : isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-inset ring-blue-500'
                    : 'hover:bg-stone-50/80 dark:hover:bg-stone-800/40 text-stone-800 dark:text-stone-200'
                }`}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                    day.isToday
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-xs'
                      : !day.isCurrentMonth
                      ? 'text-stone-400 dark:text-stone-600'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}>
                    {day.dayNumber}
                  </span>

                  {day.isCurrentMonth && hasScheduled && (
                    <div className="flex items-center gap-1">
                      {allTaken ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : day.isPast ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Missed or incomplete dose" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Scheduled intake" />
                      )}
                    </div>
                  )}
                </div>

                {/* Scheduled Badges inside Cell */}
                <div className="space-y-1 my-1 w-full overflow-hidden">
                  {day.isCurrentMonth && day.scheduledSupplements.slice(0, 2).map((item, idx) => (
                    <div
                      key={`${item.supplement.id}-${idx}`}
                      className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate font-medium flex items-center gap-1 ${
                        item.isTaken
                          ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : day.isPast
                          ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                          : 'bg-blue-100 dark:bg-blue-950/90 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                      }`}
                      title={`${item.supplement.name} (${item.supplement.doseAmount} ${item.supplement.unit}) - ${item.isTaken ? 'Taken' : 'Scheduled'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.isTaken ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} />
                      <span className="truncate">{item.supplement.name}</span>
                    </div>
                  ))}

                  {day.isCurrentMonth && day.scheduledSupplements.length > 2 && (
                    <span className="text-[9px] text-stone-500 font-bold block pl-1">
                      +{day.scheduledSupplements.length - 2} more
                    </span>
                  )}
                </div>

                {/* Bottom Day Status Indicator */}
                <div className="text-[9px] text-stone-400 truncate">
                  {day.isCurrentMonth && hasScheduled ? (
                    allTaken ? '100% taken' : `${day.scheduledSupplements.filter(s => s.isTaken).length}/${day.scheduledSupplements.length} taken`
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Selected Day Agenda Drawer */}
      {selectedDayData && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
            <div>
              <h4 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <span>Dosing Agenda for {selectedDayData.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                {selectedDayData.isToday && (
                  <span className="text-xs bg-stone-900 text-white dark:bg-white dark:text-stone-900 px-2 py-0.5 rounded-full font-bold">
                    Today
                  </span>
                )}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {selectedDayData.scheduledSupplements.length === 0
                  ? 'No supplements scheduled for this date.'
                  : `${selectedDayData.scheduledSupplements.length} supplement(s) scheduled for this date.`}
              </p>
            </div>

            {selectedDayData.scheduledSupplements.length > 0 && (
              <div className="flex items-center gap-2">
                {hasGoogleToken ? (
                  <button
                    type="button"
                    onClick={handleSyncAllRegimens}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 rounded-xl transition flex items-center gap-1 border border-blue-200 dark:border-blue-800"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Sync Day to Google Calendar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="px-3 py-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 rounded-xl transition flex items-center gap-1"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Connect Google Calendar</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedDayData.scheduledSupplements.length === 0 ? (
            <div className="py-8 text-center text-stone-500 dark:text-stone-400 space-y-2">
              <CalendarIcon className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700" />
              <p className="text-xs font-medium">
                {selectedSupplement 
                  ? `${selectedSupplement.name} is not scheduled on this day.`
                  : 'No scheduled supplement doses for this day.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDayData.scheduledSupplements.map(({ supplement: supp, isTaken, amountTaken, scheduledTime, isCyclicOff }) => (
                <div
                  key={supp.id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isTaken
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                      : 'bg-stone-50/70 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        supp.category === 'vitamins' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <span className="text-sm font-bold text-stone-900 dark:text-white">
                        {supp.name}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
                      <span>{supp.doseAmount.toLocaleString()} {supp.unit}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {scheduledTime}
                      </span>
                      {supp.foodTiming && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{supp.foodTiming.replace(/_/g, ' ')}</span>
                        </>
                      )}
                    </div>

                    {isCyclicOff && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block">
                        Scheduled Rest Break Day
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isTaken ? (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1.5 rounded-xl flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Taken
                      </span>
                    ) : (
                      onQuickLog && selectedDayData.isToday && (
                        <button
                          type="button"
                          onClick={() => onQuickLog(supp)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 rounded-xl transition shadow-xs"
                        >
                          Mark Taken
                        </button>
                      )
                    )}

                    <a
                      href={generateGoogleCalendarWebUrl(supp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Direct Google Calendar Event Link (1-tap open in Google Calendar)"
                      className="p-2 text-stone-600 hover:text-blue-600 dark:text-stone-400 dark:hover:text-blue-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition flex items-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleSyncSupplement(supp)}
                      title="Sync this supplement to Google Calendar"
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition cursor-pointer"
                    >
                      <CalendarIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
