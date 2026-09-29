import React, { useState } from 'react';
import { 
  Check, 
  RotateCcw, 
  PlusCircle, 
  CheckCircle2, 
  Clock,
  Sparkles,
  Package,
  AlertTriangle,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TodaySupplementStatus, Supplement, DoseLog } from '../types/supplement';
import { UserProfile } from '../types/profile';
import { playChimeSound } from '../utils/audio';
import { triggerHaptic, playSuccessChime } from '../utils/soundEffects';

interface TodayDosesProps {
  todayStatuses: TodaySupplementStatus[];
  allSupplements: Supplement[];
  todayLogs?: DoseLog[];
  onTakeDose: (supplement: Supplement, amount?: number, notes?: string) => void;
  onUndoDose: (supplementId: string) => void;
  onDeleteLog?: (logId: string) => void;
  onDeleteDoseToday?: (supplementId: string) => void;
  onRestoreDoseToday?: (supplementId: string) => void;
  onDeleteSupplement?: (supplementId: string) => void;
  onOpenAddModal: () => void;
  onSelectSupplement: (supplement: Supplement) => void;
  onRefillStock?: (supplementId: string) => void;
  currentTime: Date;
  profiles?: UserProfile[];
  activeProfileId?: string;
  onSelectProfile?: (profileId: string) => void;
  onOpenProfileSwitcher?: () => void;
}

export const TodayDoses: React.FC<TodayDosesProps> = ({
  todayStatuses,
  allSupplements,
  todayLogs = [],
  onTakeDose,
  onUndoDose,
  onDeleteLog,
  onDeleteDoseToday,
  onRestoreDoseToday,
  onDeleteSupplement,
  onOpenAddModal,
  onSelectSupplement,
  onRefillStock,
  currentTime,
  profiles = [],
  activeProfileId = 'profile_self',
  onSelectProfile,
  onOpenProfileSwitcher,
}) => {
  const [partialModalSupp, setPartialModalSupp] = useState<Supplement | null>(null);
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [partialNotes, setPartialNotes] = useState<string>('');
  
  // Modal for deleting / skipping a dosage
  const [doseToDelete, setDoseToDelete] = useState<Supplement | null>(null);

  // Items scheduled for today (and course is active and not dismissed)
  const scheduledToday = todayStatuses.filter((s) => s.isScheduledToday && !s.isDismissedToday);
  
  // Pending doses (remaining > 0)
  const pendingDoses = scheduledToday.filter((s) => !s.isFullyTaken);
  
  // Completed doses today
  const completedDoses = scheduledToday.filter((s) => s.isFullyTaken);

  // Dosages dismissed / deleted for today
  const dismissedDosesToday = todayStatuses.filter((s) => s.isDismissedToday);

  // Other active supplements scheduled for other days of the week or month
  const upcomingOtherDays = todayStatuses.filter(
    (s) => !s.isScheduledToday && !s.isDismissedToday && s.isCourseActive
  );

  // Supplements currently running low on stock
  const lowStockSupplements = todayStatuses.filter(
    (s) => s.isCourseActive && (s.isLowStock || s.isOutOfStock)
  );

  const handleQuickTake = (item: TodaySupplementStatus) => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10B981', '#059669', '#34D399', '#F59E0B'],
      });
    } catch {
      // ignore
    }
    playChimeSound('dose_taken');
    onTakeDose(item.supplement, item.remainingDoseToday);
  };

  const handleOpenPartial = (item: TodaySupplementStatus) => {
    setPartialModalSupp(item.supplement);
    setPartialAmount(item.remainingDoseToday);
    setPartialNotes('');
  };

  const handleSavePartial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialModalSupp) return;
    playChimeSound('dose_taken');
    onTakeDose(partialModalSupp, partialAmount, partialNotes);
    setPartialModalSupp(null);
  };

  const profileMap = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    profiles.forEach(p => map.set(p.id, p));
    return map;
  }, [profiles]);

  const activeProfile = profileMap.get(activeProfileId) || profiles[0];

  return (
    <div className="space-y-6">

      {/* Multi-Profile Switcher Strip */}
      {profiles.length > 1 && (
        <div className="p-3 sm:p-4 rounded-3xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider pl-1">
              Active Profile:
            </span>
            {profiles.map(p => {
              const isSelected = p.id === activeProfileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProfile?.(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 ${
                    isSelected
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-750'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-gradient-to-tr ${p.themeGradient} text-white flex items-center justify-center text-[9px]`}>
                    {p.avatar === 'heart' ? '♥' : p.avatar === 'sparkles' ? '★' : '•'}
                  </span>
                  <span>{p.name}</span>
                  {p.type === 'assisted' && (
                    <span className="text-[9px] px-1 rounded-sm bg-blue-500/20 text-blue-600 dark:text-blue-300">
                      Care
                    </span>
                  )}
                  {p.type === 'kid' && (
                    <span className="text-[9px] px-1 rounded-sm bg-pink-500/20 text-pink-600 dark:text-pink-300">
                      Kids
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {onOpenProfileSwitcher && (
            <button
              type="button"
              onClick={onOpenProfileSwitcher}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition"
            >
              <span>Switch / Add Profiles</span>
            </button>
          )}
        </div>
      )}

      {/* Dad Assisted Care Mode Banner */}
      {activeProfile?.type === 'assisted' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 flex items-start gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            ♥
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-blue-950 dark:text-blue-100 font-display">
              Caregiver View: {activeProfile.name}'s Health Regimen
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Assisted care is active. Make sure {activeProfile.name} takes morning doses with food and a full glass of water. Mark doses complete below on his behalf.
            </p>
          </div>
        </div>
      )}

      {/* Kids Fun Gamified Mode Banner */}
      {activeProfile?.type === 'kid' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-rose-50 to-pink-50 dark:from-pink-950/30 dark:via-purple-950/30 dark:to-rose-950/30 border border-pink-200 dark:border-pink-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm text-lg font-bold">
              ⭐
            </div>
            <div>
              <h4 className="text-sm font-bold text-pink-950 dark:text-pink-100 font-display">
                {activeProfile.name}'s Daily Vitamin Adventure!
              </h4>
              <p className="text-xs text-pink-800 dark:text-pink-300 mt-0.5">
                Take your chewable gummy vitamins every day to build your health streak and earn gold stars!
              </p>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-2xl bg-white dark:bg-stone-800 border border-pink-200 dark:border-pink-700 text-xs font-bold text-pink-600 dark:text-pink-300 flex items-center gap-1.5 shadow-2xs self-start sm:self-auto">
            <span>⭐⭐ 2 Stars Earned Today!</span>
          </div>
        </div>
      )}

      {/* Global Low Stock Alert Banner (when any supplement is running low) */}
      {lowStockSupplements.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border border-amber-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 font-display">
                Low Inventory Refill Warning
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {lowStockSupplements.map(s => `${s.supplement.name} (${s.remainingStock} ${s.stockUnit} left)`).join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lowStockSupplements.map(item => (
              <button
                key={item.supplement.id}
                type="button"
                onClick={() => onRefillStock?.(item.supplement.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refill {item.supplement.name.split('(')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: Due Today */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 font-display flex items-center gap-2">
              <span>Due Today</span>
              {pendingDoses.length > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {pendingDoses.length} pending
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Scheduled intakes for your daily regimen. Log or manually delete dosages as needed.
            </p>
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-colors border border-emerald-200"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Supplement</span>
          </button>
        </div>

        {pendingDoses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingDoses.map((status) => {
              const { supplement, remainingDoseToday, totalScheduledDose, totalTakenDose } = status;
              const hasTakenPartial = totalTakenDose > 0;
              const hasStock = status.remainingStock !== undefined;
              const suppProfile = profileMap.get(supplement.profileId || 'profile_self');

              return (
                <div
                  key={supplement.id}
                  className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header line: Form / Category and Profile Badge */}
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {suppProfile && (
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex items-center gap-1 shadow-2xs"
                            style={{ backgroundColor: suppProfile.accentColor || '#10b981' }}
                          >
                            <span>{suppProfile.avatar === 'heart' ? '♥' : suppProfile.avatar === 'sparkles' ? '★' : '•'}</span>
                            <span>{suppProfile.name}</span>
                          </span>
                        )}
                        <span className="capitalize font-medium text-stone-700">
                          {supplement.form} · {supplement.category}
                        </span>
                        {supplement.cycleConfig?.isCyclic && (
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                            Cyclic Phase
                          </span>
                        )}
                      </div>
                      {supplement.duration.type === 'infinity' ? (
                        <span className="text-amber-800 font-semibold bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg text-[11px]">
                          ∞ For Life
                        </span>
                      ) : supplement.duration.type === 'fixed' ? (
                        <span className="text-stone-500">
                          {status.daysRemainingInCourse} days left in course
                        </span>
                      ) : null}
                    </div>

                    {/* Title */}
                    <h3 
                      onClick={() => onSelectSupplement(supplement)}
                      className="text-lg font-bold text-stone-900 hover:text-emerald-700 cursor-pointer transition-colors"
                    >
                      {supplement.name}
                    </h3>

                    {/* Cyclic protocol phase indicator if applicable */}
                    {status.cyclePhase && (
                      <div className="mt-2 text-xs font-medium text-indigo-900 bg-indigo-50/80 border border-indigo-200/70 px-2.5 py-1 rounded-xl flex items-center justify-between">
                        <span>{status.cyclePhase.phaseLabel}</span>
                        <span className="text-[10px] font-mono font-bold bg-indigo-200/80 text-indigo-950 px-1.5 py-0.2 rounded">
                          ON
                        </span>
                      </div>
                    )}

                    {/* Expiry status badge if set */}
                    {status.expiryStatus?.hasExpiry && (
                      <div className={`mt-2.5 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between border ${
                        status.expiryStatus.isExpired
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
                          : status.expiryStatus.isNearingExpiry
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                          : 'bg-stone-50 border-stone-200/70 text-stone-600'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${
                            status.expiryStatus.isExpired ? 'text-rose-600' : status.expiryStatus.isNearingExpiry ? 'text-amber-600' : 'text-stone-400'
                          }`} />
                          <span>Exp: {supplement.expiryDate}</span>
                        </div>
                        <div>
                          {status.expiryStatus.isExpired ? (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                              ⚠️ Expired ({Math.abs(status.expiryStatus.daysUntilExpiry)}d ago)
                            </span>
                          ) : status.expiryStatus.isNearingExpiry ? (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              ⚠️ {status.expiryStatus.daysUntilExpiry}d left
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-medium">✓ Fresh</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* The prominent "Scheduled For Today" box */}
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/70 border border-amber-200/70 dark:border-amber-800/70">
                      <div className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-0.5">
                        Scheduled For Today
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold text-amber-950 dark:text-amber-100 font-display tabular-nums">
                        {remainingDoseToday.toLocaleString()}{' '}
                        <span className="text-base font-semibold text-amber-800 dark:text-amber-200">{supplement.unit}</span>
                        <span className="text-sm font-normal text-amber-800 dark:text-amber-300 ml-2">left to take</span>
                      </div>
                      {hasTakenPartial && (
                        <div className="text-xs text-amber-700 dark:text-amber-200 mt-1">
                          Already logged: {totalTakenDose.toLocaleString()} {supplement.unit} of {totalScheduledDose.toLocaleString()} {supplement.unit}
                        </div>
                      )}
                    </div>

                    {/* Stock indicator */}
                    {hasStock && (
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <div className={`flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg ${
                          status.isOutOfStock
                            ? 'bg-rose-100 text-rose-800'
                            : status.isLowStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}>
                          <Package className="w-3.5 h-3.5" />
                          <span>{status.remainingStock} {status.stockUnit} remaining</span>
                          {status.isLowStock && <span>(Low Stock)</span>}
                        </div>

                        {supplement.notes && (
                          <span className="text-stone-500 text-xs truncate max-w-[200px]" title={supplement.notes}>
                            {supplement.notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions: Take Full Dose, Partial, and Manual Delete Dose */}
                  <div className="mt-5 pt-3 border-t border-stone-100 flex items-center gap-2">
                    <button
                      onClick={() => handleQuickTake(status)}
                      className="flex-1 h-11 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>
                        {suppProfile?.type === 'assisted'
                          ? `Check off for ${suppProfile.name}`
                          : suppProfile?.type === 'kid'
                          ? 'Take Gummy & Earn Star! ⭐'
                          : `Take Full Dose (${remainingDoseToday.toLocaleString()} ${supplement.unit})`}
                      </span>
                    </button>

                    <button
                      onClick={() => handleOpenPartial(status)}
                      title="Log partial amount or add custom notes"
                      className="h-11 px-3 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-2xl transition-colors whitespace-nowrap"
                    >
                      Partial
                    </button>

                    {/* Delete Dosage Button */}
                    <button
                      onClick={() => setDoseToDelete(status.supplement)}
                      title="Delete this dosage (manually remove if not needed)"
                      className="h-11 px-3 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/80 rounded-2xl transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span className="hidden sm:inline">Delete Dose</span>
                      <span className="sm:hidden">Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200/80 p-8 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 font-display">
              {scheduledToday.length > 0 ? 'All Set for Today!' : 'No Doses Due Today'}
            </h3>
            <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
              {scheduledToday.length > 0
                ? 'You have logged all scheduled doses for today. Keep up the consistent habit!'
                : 'None of your active supplements have a scheduled intake for today. Check your upcoming schedule below.'}
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Completed Today */}
      {completedDoses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">
            Completed Today ({completedDoses.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completedDoses.map((status) => (
              <div
                key={status.supplement.id}
                className="bg-stone-50/70 border border-stone-200/70 rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 line-through text-stone-500">
                      {status.supplement.name}
                    </h4>
                    <p className="text-xs text-emerald-700 font-medium">
                      {status.totalTakenDose.toLocaleString()} {status.supplement.unit} taken today · 0 left
                    </p>
                  </div>
                </div>

                {/* Explicit Delete Dosage / Undo button */}
                <button
                  onClick={() => onUndoDose(status.supplement.id)}
                  title="Delete today's logged dose"
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Dosage</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Today's Individual Logged Dosages (with direct deletion) */}
      {todayLogs.length > 0 && (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 font-display">
                Today's Recorded Intake Logs ({todayLogs.length})
              </h3>
              <p className="text-xs text-stone-500">
                Individual doses logged today. Delete any unwanted or duplicate dosage manually.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {todayLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200/70 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-semibold text-stone-900">{log.supplementName}</span>
                    <span className="text-emerald-700 font-bold ml-2">
                      +{log.amountTaken.toLocaleString()} {log.unit}
                    </span>
                    {log.notes && (
                      <span className="text-stone-500 italic ml-2">"{log.notes}"</span>
                    )}
                  </div>
                </div>

                {onDeleteLog && (
                  <button
                    onClick={() => onDeleteLog(log.id)}
                    title="Delete this dosage entry"
                    className="flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200/60 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Dosage</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Dosages Deleted / Dismissed for Today */}
      {dismissedDosesToday.length > 0 && (
        <div className="bg-stone-50/80 rounded-3xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-800 font-display flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-stone-400" />
                <span>Dosages Deleted for Today ({dismissedDosesToday.length})</span>
              </h3>
              <p className="text-xs text-stone-500">
                You chose to delete these doses for today. You can restore them anytime if plans change.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dismissedDosesToday.map((status) => (
              <div
                key={status.supplement.id}
                className="bg-white p-3 rounded-2xl border border-stone-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-stone-700 line-through text-stone-400">
                    {status.supplement.name}
                  </span>
                  <div className="text-stone-400">
                    {status.supplement.doseAmount.toLocaleString()} {status.supplement.unit} · Skipped today
                  </div>
                </div>

                {onRestoreDoseToday && (
                  <button
                    onClick={() => onRestoreDoseToday(status.supplement.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Dose</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Upcoming Regimen Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 font-display">
              Upcoming Schedule
            </h3>
            <p className="text-xs text-stone-500">
              Active supplements scheduled on other days
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {upcomingOtherDays.map((status) => {
            const nextDate = status.nextScheduledDateTime;
            const dayStr = nextDate ? nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Pending';

            return (
              <div
                key={status.supplement.id}
                onClick={() => onSelectSupplement(status.supplement)}
                className="bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                    <span className="font-medium text-stone-600 capitalize">
                      {status.supplement.frequencyType} Regimen
                    </span>
                    <span className="text-emerald-700 font-semibold tabular-nums">
                      {status.supplement.doseAmount.toLocaleString()} {status.supplement.unit}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900 truncate">
                    {status.supplement.name}
                  </h4>

                  {status.cyclePhase && !status.cyclePhase.inActivePhase ? (
                    <div className="mt-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-xl flex items-center justify-between">
                      <span>Rest Break: {status.cyclePhase.daysUntilNextPhase}d left</span>
                      <span className="text-[10px] uppercase font-mono bg-amber-200/70 text-amber-950 px-1.5 py-0.2 rounded font-bold">
                        Pause
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-stone-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Due {dayStr}</span>
                    </div>
                  )}
                  {status.expiryStatus?.hasExpiry && (
                    <div className="mt-2 text-[11px] flex items-center justify-between">
                      <span className="text-stone-400">Exp: {status.supplement.expiryDate}</span>
                      {status.expiryStatus.isExpired ? (
                        <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Expired</span>
                      ) : status.expiryStatus.isNearingExpiry ? (
                        <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">{status.expiryStatus.daysUntilExpiry}d left</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Fresh</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                  <span className="text-stone-500 capitalize">
                    {status.supplement.category}
                  </span>
                  <span className="font-medium text-emerald-700">
                    {status.supplement.duration.type === 'infinity' ? '∞ For Life' : 'Active Protocol'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Dosage Confirmation Modal */}
      {doseToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-rose-700">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-700" />
                </div>
                <h3 className="text-lg font-bold font-display text-stone-900">
                  Delete Dosage
                </h3>
              </div>
              <button
                onClick={() => setDoseToDelete(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4">
              <p className="text-sm text-stone-700 font-medium">
                {doseToDelete.name} ({doseToDelete.doseAmount.toLocaleString()} {doseToDelete.unit})
              </p>
              <p className="text-xs text-stone-500 mt-1">
                How would you like to handle this dosage?
              </p>

              <div className="mt-4 space-y-2.5">
                {/* Option 1: Delete Dosage for Today */}
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteDoseToday) {
                      onDeleteDoseToday(doseToDelete.id);
                    }
                    setDoseToDelete(null);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 transition-colors group"
                >
                  <div className="text-xs font-bold text-rose-900 group-hover:text-rose-950">
                    Delete dosage for today only
                  </div>
                  <div className="text-[11px] text-rose-700/90 mt-0.5">
                    Removes today's dosage requirement. You won't be prompted for it today, and you can restore it anytime.
                  </div>
                </button>

                {/* Option 2: Delete Supplement Regimen Entirely */}
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteSupplement) {
                      onDeleteSupplement(doseToDelete.id);
                    }
                    setDoseToDelete(null);
                  }}
                  className="w-full text-left p-3.5 rounded-2xl border border-stone-200 hover:bg-stone-100 transition-colors group"
                >
                  <div className="text-xs font-bold text-stone-800 group-hover:text-rose-700">
                    Delete supplement permanently
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Completely remove this supplement regimen and all future scheduled reminders.
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDoseToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial / Custom Log Dialog */}
      {partialModalSupp && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 font-display mb-1">
              Log Custom Dose
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Recording intake for {partialModalSupp.name}
            </p>

            <form onSubmit={handleSavePartial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Amount Taken ({partialModalSupp.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={partialNotes}
                  onChange={(e) => setPartialNotes(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPartialModalSupp(null)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                >
                  Save Dose
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
