import React, { useState, useMemo, useEffect } from 'react';
import { 
  Check, 
  RotateCcw, 
  Sun, 
  Zap, 
  Utensils, 
  Dumbbell, 
  Moon, 
  Clock, 
  Package, 
  AlertTriangle, 
  Repeat, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Info,
  ExternalLink,
  PlusCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TodaySupplementStatus, Supplement, DoseLog, TimingSlot } from '../types/supplement';
import { UserProfile } from '../types/profile';
import { 
  categorizeTimingSlot, 
  TIMING_SLOT_METAS, 
  ORDERED_TIMING_SLOTS, 
  calculateStockDaysRemaining,
  TimingSlotMeta
} from '../utils/inventory';
import { getCyclePhase } from '../utils/dates';
import { triggerHaptic, playSuccessChime } from '../utils/soundEffects';
import { playChimeSound } from '../utils/audio';

interface DailyChecklistProps {
  todayStatuses: TodaySupplementStatus[];
  allSupplements: Supplement[];
  todayLogs?: DoseLog[];
  onTakeDose: (supplement: Supplement, amount?: number, notes?: string) => void;
  onUndoDose: (supplementId: string) => void;
  onOpenAddModal: () => void;
  onSelectSupplement: (supplement: Supplement) => void;
  onRefillStock?: (supplementId: string) => void;
  onOpenValueCalculator?: () => void;
  currentTime: Date;
  profiles?: UserProfile[];
  activeProfileId?: string;
  onSelectProfile?: (profileId: string) => void;
}

export const DailyChecklist: React.FC<DailyChecklistProps> = ({
  todayStatuses,
  allSupplements,
  todayLogs = [],
  onTakeDose,
  onUndoDose,
  onOpenAddModal,
  onSelectSupplement,
  onRefillStock,
  onOpenValueCalculator,
  currentTime,
  profiles = [],
  activeProfileId = 'profile_self',
  onSelectProfile,
}) => {
  // Collapsible slots state (default open)
  const [collapsedSlots, setCollapsedSlots] = useState<Record<string, boolean>>({});

  // Active Undo Toast state (5-second timeout)
  const [undoToast, setUndoToast] = useState<{
    supplement: Supplement;
    amount: number;
    stockRemaining?: number;
    unit?: string;
  } | null>(null);

  // Active Batch Undo Toast state (5-second timeout)
  const [batchUndoToast, setBatchUndoToast] = useState<{
    slotLabel: string;
    items: TodaySupplementStatus[];
  } | null>(null);

  // Auto-dismiss undo toast after 5 seconds
  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  // Auto-dismiss batch undo toast after 5 seconds
  useEffect(() => {
    if (!batchUndoToast) return;
    const timer = setTimeout(() => {
      setBatchUndoToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [batchUndoToast]);

  const toggleSlotCollapse = (slotId: string) => {
    setCollapsedSlots((prev) => ({
      ...prev,
      [slotId]: !prev[slotId],
    }));
  };

  // Group scheduled items into timing slots
  const slottedGroups = useMemo(() => {
    // Only items scheduled today and not dismissed
    const scheduledToday = todayStatuses.filter(
      (s) => s.isScheduledToday && !s.isDismissedToday
    );

    const groups: Record<TimingSlot, TodaySupplementStatus[]> = {
      morning_empty_stomach: [],
      pre_workout: [],
      with_meals: [],
      post_workout: [],
      bedtime: [],
      anytime: [],
    };

    scheduledToday.forEach((status) => {
      const slot = categorizeTimingSlot(status.supplement);
      groups[slot].push(status);
    });

    return groups;
  }, [todayStatuses]);

  // Overall today completion counts
  const overallStats = useMemo(() => {
    const scheduled = todayStatuses.filter((s) => s.isScheduledToday && !s.isDismissedToday);
    const taken = scheduled.filter((s) => s.isFullyTaken);
    const percent = scheduled.length > 0 ? Math.round((taken.length / scheduled.length) * 100) : 100;
    return {
      total: scheduled.length,
      taken: taken.length,
      pending: scheduled.length - taken.length,
      percent,
    };
  }, [todayStatuses]);

  // Render timing slot icon
  const renderSlotIcon = (icon: TimingSlotMeta['icon']) => {
    switch (icon) {
      case 'sun':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'zap':
        return <Zap className="w-4 h-4 text-orange-500" />;
      case 'utensils':
        return <Utensils className="w-4 h-4 text-emerald-500" />;
      case 'dumbbell':
        return <Dumbbell className="w-4 h-4 text-sky-500" />;
      case 'moon':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      case 'clock':
      default:
        return <Clock className="w-4 h-4 text-stone-400" />;
    }
  };

  // 1-Tap Toggle: marks as taken or un-takes
  const handleToggleCheck = (item: TodaySupplementStatus) => {
    if (item.isFullyTaken) {
      // Un-check / Undo dose
      onUndoDose(item.supplement.id);
      setUndoToast(null);
    } else {
      // 1-Tap Quick Take with haptic, confetti & sound
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10B981', '#059669', '#34D399', '#F59E0B', '#3B82F6'],
        });
      } catch {
        // Confetti optional
      }
      triggerHaptic('success');
      playSuccessChime();
      playChimeSound('dose_taken');

      const amountToLog = item.remainingDoseToday > 0 ? item.remainingDoseToday : item.supplement.doseAmount;
      onTakeDose(item.supplement, amountToLog);

      // Show 5-second quick-undo toast
      const newStock = item.supplement.inventory?.trackStock
        ? Math.max(0, (item.supplement.inventory.currentStock || 0) - (item.supplement.doseAmount || 1))
        : undefined;

      setUndoToast({
        supplement: item.supplement,
        amount: amountToLog,
        stockRemaining: newStock,
        unit: item.supplement.inventory?.unit || item.supplement.unit,
      });
    }
  };

  const handleUndoFromToast = () => {
    if (undoToast) {
      onUndoDose(undoToast.supplement.id);
      setUndoToast(null);
    }
  };

  // 1-Tap Take All for a Timing Slot
  const handleTakeAllSlot = (
    e: React.MouseEvent,
    items: TodaySupplementStatus[],
    slotLabel: string,
    shortLabel: string
  ) => {
    e.stopPropagation();
    const pendingItems = items.filter((i) => !i.isFullyTaken);
    if (pendingItems.length === 0) return;

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#10B981', '#059669', '#34D399', '#F59E0B', '#3B82F6'],
      });
    } catch {
      // Confetti optional
    }
    triggerHaptic('success');
    playSuccessChime();
    playChimeSound('dose_taken');

    pendingItems.forEach((item) => {
      const amountToLog = item.remainingDoseToday > 0 ? item.remainingDoseToday : item.supplement.doseAmount;
      onTakeDose(item.supplement, amountToLog);
    });

    setUndoToast(null);
    setBatchUndoToast({
      slotLabel: shortLabel || slotLabel,
      items: pendingItems,
    });
  };

  const handleUndoBatch = () => {
    if (batchUndoToast) {
      batchUndoToast.items.forEach((item) => {
        onUndoDose(item.supplement.id);
      });
      setBatchUndoToast(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Floating 5-Second Quick-Undo Toast (Single Dose) */}
      {undoToast && (
        <aside 
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-4 py-3 rounded-2xl shadow-2xl border border-stone-800 dark:border-stone-200 flex items-center gap-3.5 max-w-md">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold">
                Logged {undoToast.amount.toLocaleString()} {undoToast.supplement.unit} of {undoToast.supplement.name}
              </p>
              {undoToast.stockRemaining !== undefined && (
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  Stock remaining: {undoToast.stockRemaining} {undoToast.unit}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleUndoFromToast}
              className="ml-auto px-2.5 py-1 text-xs font-bold bg-stone-800 dark:bg-stone-100 text-emerald-400 dark:text-emerald-600 hover:bg-stone-700 dark:hover:bg-stone-200 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          </div>
        </aside>
      )}

      {/* Floating 5-Second Consolidated Batch Undo Toast */}
      {batchUndoToast && (
        <aside 
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-4 py-3 rounded-2xl shadow-2xl border border-stone-800 dark:border-stone-200 flex items-center gap-3.5 max-w-md">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="text-xs">
              <p className="font-bold">
                Logged all {batchUndoToast.items.length} {batchUndoToast.slotLabel.toLowerCase()} dose{batchUndoToast.items.length === 1 ? '' : 's'}
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">
                1 physical serving deducted per supplement
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndoBatch}
              className="ml-auto px-2.5 py-1 text-xs font-bold bg-stone-800 dark:bg-stone-100 text-emerald-400 dark:text-emerald-600 hover:bg-stone-700 dark:hover:bg-stone-200 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo All</span>
            </button>
          </div>
        </aside>
      )}

      {/* Daily Progress & Value Bar */}
      <div className="rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                Daily Regimen Checklist
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                {overallStats.taken} / {overallStats.total} Taken ({overallStats.percent}%)
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
              {overallStats.pending === 0 && overallStats.total > 0
                ? '🎉 All daily doses completed! Great consistency today.'
                : `${overallStats.pending} dose${overallStats.pending === 1 ? '' : 's'} remaining across biological timing slots`}
            </h3>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onOpenValueCalculator && (
              <button
                type="button"
                onClick={onOpenValueCalculator}
                className="px-3.5 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="View Cost Per Serving and Refill Predictor"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Value & Refill Predictor</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Supplement</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden mt-4">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${overallStats.percent}%` }}
          />
        </div>
      </div>

      {/* Empty State */}
      {overallStats.total === 0 && (
        <div className="p-8 sm:p-12 text-center rounded-3xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-stone-900 dark:text-white">
            No supplements scheduled for today
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You're either on a full rest day or haven't scheduled any supplements for today.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer"
          >
            Add To Your Daily Regimen
          </button>
        </div>
      )}

      {/* Actionable Time-Based Slots */}
      <div className="space-y-4">
        {ORDERED_TIMING_SLOTS.map((slotId) => {
          const items = slottedGroups[slotId];
          if (!items || items.length === 0) return null;

          const meta = TIMING_SLOT_METAS[slotId];
          const isCollapsed = !!collapsedSlots[slotId];
          const takenCount = items.filter((i) => i.isFullyTaken).length;
          const allSlotTaken = takenCount === items.length && items.length > 0;

          return (
            <div 
              key={slotId}
              className={`rounded-3xl border transition-all overflow-hidden ${
                allSlotTaken 
                  ? 'border-stone-200/60 dark:border-stone-800/60 bg-stone-50/30 dark:bg-stone-900/30' 
                  : 'border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs'
              }`}
            >
              {/* Slot Header Bar */}
              <button
                type="button"
                onClick={() => toggleSlotCollapse(slotId)}
                className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left cursor-pointer hover:bg-stone-50/60 dark:hover:bg-stone-850/60 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.badgeBg}`}>
                    {renderSlotIcon(meta.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                        {meta.label}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                        {meta.timeRange}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 hidden sm:block">
                      {meta.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  {items.length - takenCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleTakeAllSlot(e, items, meta.label, meta.shortLabel)}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                      title={`Mark all ${items.length - takenCount} pending doses in ${meta.label} as taken`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Take All {meta.shortLabel} ({items.length - takenCount})</span>
                    </button>
                  )}
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                    allSlotTaken
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                  }`}>
                    {takenCount} / {items.length}
                  </span>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </button>

              {/* Slot Items List */}
              {!isCollapsed && (
                <div className="px-3 sm:px-4 pb-4 space-y-2.5 border-t border-stone-100 dark:border-stone-800/80 pt-3">
                  {items.map((item) => {
                    const supp = item.supplement;
                    const isTaken = item.isFullyTaken;
                    const stockCalc = calculateStockDaysRemaining(supp, currentTime);
                    const cyclePhase = supp.cycleConfig?.isCyclic ? getCyclePhase(supp, currentTime) : null;
                    const isRestPhase = cyclePhase && !cyclePhase.inActivePhase;

                    return (
                      <div
                        key={supp.id}
                        onClick={() => onSelectSupplement(supp)}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isTaken
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50 opacity-90'
                            : isRestPhase
                            ? 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800 opacity-70'
                            : stockCalc.isOutOfStock
                            ? 'bg-rose-50/20 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                            : stockCalc.isLowStock
                            ? 'bg-amber-50/20 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                            : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                        }`}
                      >
                        {/* Left: 1-Tap Toggle Circle & Details */}
                        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                          
                          {/* 1-Tap Touch Target (Minimum 48x48px hit area per ergonomics) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCheck(item);
                            }}
                            title={isTaken ? 'Click to unmark dose' : 'Click to mark dose taken (auto-deducts stock)'}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                              isTaken
                                ? 'bg-emerald-600 text-white shadow-xs scale-95'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-2 border-stone-200 dark:border-stone-700'
                            }`}
                          >
                            <Check className={`w-6 h-6 stroke-[3] transition-transform ${isTaken ? 'scale-100' : 'scale-75 opacity-40'}`} />
                          </button>

                          {/* Info Column */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className={`font-bold text-sm sm:text-base tracking-tight truncate ${
                                isTaken ? 'line-through text-stone-500 dark:text-stone-400' : 'text-stone-900 dark:text-white'
                              }`}>
                                {supp.name}
                              </h5>

                              {/* Dose tag */}
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md font-mono tabular-nums">
                                {supp.doseAmount.toLocaleString()} {supp.unit}
                              </span>

                              {/* Form & Category */}
                              <span className="text-[11px] text-stone-500 dark:text-stone-400 capitalize hidden sm:inline">
                                · {supp.form} · {supp.category}
                              </span>
                            </div>

                            {/* Badges row: Timing note, Cycle status, Stock remaining */}
                            <div className="flex items-center gap-2 flex-wrap mt-1 text-xs">
                              
                              {/* Scheduled time */}
                              <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {supp.doseTime || '09:00'}
                              </span>

                              {/* Cyclic Protocol Countdown */}
                              {supp.cycleConfig?.isCyclic && cyclePhase && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                                  cyclePhase.inActivePhase
                                    ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                    : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                                }`}>
                                  <Repeat className="w-3 h-3 text-indigo-500" />
                                  <span>
                                    {cyclePhase.inActivePhase
                                      ? `Active: Day ${cyclePhase.phaseDay} of ${cyclePhase.totalPhaseDays} (${cyclePhase.daysUntilNextPhase}d left)`
                                      : `Rest Break: Day ${cyclePhase.phaseDay} of ${cyclePhase.totalPhaseDays} (Resumes in ${cyclePhase.daysUntilNextPhase}d)`}
                                  </span>
                                </span>
                              )}

                              {/* Dynamic 7-Day Low-Stock / Out of Stock Alert */}
                              {supp.inventory?.trackStock && (
                                <>
                                  {stockCalc.isOutOfStock ? (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      Out of Stock (Refill Needed)
                                    </span>
                                  ) : stockCalc.isLowStock ? (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      Low Stock: {stockCalc.daysRemaining}d left ({stockCalc.remainingServings} doses) · Reorder by {stockCalc.refillDateFormatted}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                                      {stockCalc.remainingServings} doses left{stockCalc.refillDateFormatted ? ` · Reorder by ${stockCalc.refillDateFormatted}` : ''}
                                    </span>
                                  )}
                                </>
                              )}

                            </div>
                          </div>
                        </div>

                        {/* Right: Quick Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          {stockCalc.isLowStock && onRefillStock && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRefillStock(supp.id);
                              }}
                              title="Refill stock to full bottle"
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Refill</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCheck(item);
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                              isTaken
                                ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs active:scale-95'
                            }`}
                          >
                            {isTaken ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Undo</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Take Dose</span>
                              </>
                            )}
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
