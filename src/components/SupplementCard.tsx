import React from 'react';
import { 
  Clock, 
  Hourglass, 
  RotateCw, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Pill,
  Utensils,
  Package,
  AlertTriangle,
  RefreshCw,
  Infinity as InfinityIcon,
  Repeat,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Supplement, TodaySupplementStatus, DayOfWeek } from '../types/supplement';
import { UserProfile } from '../types/profile';
import { getDayName, getDayShortName } from '../utils/dates';

interface SupplementCardProps {
  supplement: Supplement;
  status: TodaySupplementStatus;
  profile?: UserProfile;
  onEdit: (supplement: Supplement) => void;
  onDelete: (supplementId: string) => void;
  onRenewCourse: (supplement: Supplement) => void;
  onQuickLog: (supplement: Supplement) => void;
  onRefillStock?: (supplementId: string) => void;
  onViewInCalendar?: (supplement: Supplement) => void;
  onSyncToCalendar?: (supplement: Supplement) => void;
}

export const SupplementCard: React.FC<SupplementCardProps> = ({
  supplement,
  status,
  profile,
  onEdit,
  onDelete,
  onRenewCourse,
  onQuickLog,
  onRefillStock,
  onViewInCalendar,
  onSyncToCalendar,
}) => {
  const isExpired = status.isCourseExpired;
  const isFixedDuration = supplement.duration.type === 'fixed';
  const isInfinity = supplement.duration.type === 'infinity';
  const isCyclic = supplement.cycleConfig?.isCyclic;
  const hasInventory = supplement.inventory?.trackStock ?? false;
  const isLowStock = status.isLowStock;
  const isOutOfStock = status.isOutOfStock;

  // Format schedule display
  let scheduleDescription = '';
  if (supplement.frequencyType === 'daily') {
    scheduleDescription = isCyclic ? `Daily (${supplement.cycleConfig?.onDays}d ON / ${supplement.cycleConfig?.offDays}d OFF)` : 'Daily';
  } else if (supplement.frequencyType === 'weekly') {
    const days = (supplement.selectedDays || [1]).map((d) => getDayName(d as DayOfWeek));
    scheduleDescription = `Weekly on ${days.join(', ')}`;
  } else if (supplement.frequencyType === 'monthly') {
    scheduleDescription = `Monthly on day ${supplement.monthlyDayOfMonth || 1}`;
  } else if (supplement.frequencyType === 'interval') {
    scheduleDescription = `Every ${supplement.intervalDays || 2} days`;
  }

  // Stock calculations
  const currentStock = supplement.inventory?.currentStock ?? 0;
  const bottleSize = supplement.inventory?.bottleSize ?? 60;
  const stockPercent = Math.min(100, Math.max(0, Math.round((currentStock / bottleSize) * 100)));

  // Expiry calculations
  const isBottleExpired = status.expiryStatus?.isExpired;
  const isBottleExpiringSoon = status.expiryStatus?.isNearingExpiry;

  return (
    <div className={`rounded-3xl border transition-all bg-white dark:bg-stone-900 p-5 sm:p-6 shadow-xs flex flex-col justify-between ${
      isExpired
        ? 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/60 opacity-85'
        : isBottleExpired
        ? 'border-rose-400 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/40 ring-1 ring-rose-200 dark:ring-rose-800'
        : isOutOfStock
        ? 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-100 dark:ring-rose-900 bg-white dark:bg-stone-900'
        : isBottleExpiringSoon
        ? 'border-amber-400 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/40 ring-1 ring-amber-200 dark:ring-amber-800'
        : isLowStock
        ? 'border-amber-300 dark:border-amber-800 ring-1 ring-amber-100 dark:ring-amber-900 bg-white dark:bg-stone-900'
        : 'border-stone-200/90 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
    }`}>
      <div>
        {/* Top bar: Category & Status */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {profile && (
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex items-center gap-1 shadow-2xs"
                style={{ backgroundColor: profile.accentColor || '#10b981' }}
              >
                <span>{profile.avatar === 'heart' ? '♥' : profile.avatar === 'sparkles' ? '★' : '•'}</span>
                <span>{profile.name}</span>
              </span>
            )}
            <span className="capitalize font-medium text-stone-700 dark:text-stone-300">
              {supplement.category} · {supplement.form}
            </span>
            {isCyclic && (
              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Repeat className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Special Cycle</span>
              </span>
            )}
            {isBottleExpired && (
              <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>Bottle Expired</span>
              </span>
            )}
            {isBottleExpiringSoon && !isBottleExpired && (
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Expiring ({status.expiryStatus?.daysUntilExpiry}d)</span>
              </span>
            )}
          </div>

          <div>
            {isExpired ? (
              <span className="text-stone-600 dark:text-stone-300 font-semibold flex items-center gap-1 bg-stone-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                Course Completed (Inactive)
              </span>
            ) : isInfinity ? (
              <span className="text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/80 border border-amber-200/80 dark:border-amber-700/80 px-2.5 py-0.5 rounded-lg">
                <InfinityIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>∞ For Life</span>
              </span>
            ) : isFixedDuration ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80">
                <Hourglass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Active ({status.daysRemainingInCourse}d left)
              </span>
            ) : (
              <span className="text-stone-600 dark:text-stone-400 font-medium">Ongoing Regimen</span>
            )}
          </div>
        </div>

        {/* Title & Dose */}
        <div className="flex items-start justify-between gap-2 mt-1">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">
              {supplement.name}
            </h3>
            <div className="text-emerald-700 dark:text-emerald-400 font-bold font-display text-xl mt-0.5 tabular-nums">
              {supplement.doseAmount.toLocaleString()}{' '}
              <span className="text-sm font-semibold text-stone-600 dark:text-stone-400">{supplement.unit}</span>
            </div>
          </div>
        </div>

        {/* Schedule details */}
        <div className="mt-4 space-y-2 text-xs text-stone-600 dark:text-stone-300">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
              <span className="font-medium text-stone-800 dark:text-stone-200">
                {scheduleDescription} · {supplement.doseTime || '09:00'}
                {supplement.foodTiming && ` (${supplement.foodTiming.replace(/_/g, ' ')})`}
              </span>
            </div>

            {/* Google Calendar Sync Badge */}
            {supplement.syncToGoogleCalendar ? (
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 text-blue-500" />
                <span>G-Cal Synced</span>
              </span>
            ) : onSyncToCalendar ? (
              <button
                type="button"
                onClick={() => onSyncToCalendar(supplement)}
                className="text-[10px] font-bold text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <CalendarIcon className="w-3 h-3" />
                <span>Sync to G-Cal</span>
              </button>
            ) : null}
          </div>

          {/* Weekday Intake Badges (shows on which days of the week it's taken) */}
          <div className="flex items-center justify-between pt-1 pb-0.5">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                const isDaily = supplement.frequencyType === 'daily';
                const isWeeklyScheduled = supplement.frequencyType === 'weekly' && (supplement.selectedDays || [1]).includes(dayIdx as DayOfWeek);
                const isActiveDay = isDaily || isWeeklyScheduled;
                return (
                  <span
                    key={dayIdx}
                    className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${
                      isActiveDay
                        ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600'
                    }`}
                    title={`${getDayName(dayIdx as DayOfWeek)}: ${isActiveDay ? 'Scheduled intake day' : 'Rest / Not scheduled'}`}
                  >
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayIdx]}
                  </span>
                );
              })}
            </div>

            {/* View in Calendar Action */}
            {onViewInCalendar && (
              <button
                type="button"
                onClick={() => onViewInCalendar(supplement)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer"
                title={`Open calendar view showing all scheduled days for ${supplement.name}`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar Days</span>
              </button>
            )}
          </div>

          {/* Cyclic Phase Banner if applicable */}
          {isCyclic && status.cyclePhase && (
            <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              status.cyclePhase.inActivePhase
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium'
                : 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium'
            }`}>
              <div className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{status.cyclePhase.phaseLabel}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                status.cyclePhase.inActivePhase ? 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100' : 'bg-amber-200/80 dark:bg-amber-900 text-amber-950 dark:text-amber-100'
              }`}>
                {status.cyclePhase.inActivePhase ? 'ON' : 'REST'}
              </span>
            </div>
          )}

          {/* Schedule status badge */}
          {!isExpired && (
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
              isCyclic && status.cyclePhase && !status.cyclePhase.inActivePhase
                ? 'text-amber-800 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/70 border-amber-200/70 dark:border-amber-800/70'
                : 'text-emerald-800 dark:text-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/70 border-emerald-100 dark:border-emerald-800/70'
            }`}>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">{status.isScheduledToday ? (status.isFullyTaken ? 'Completed today' : `${status.remainingDoseToday.toLocaleString()} ${supplement.unit} due today`) : status.statusText}</span>
            </div>
          )}
        </div>

        {/* Remaining Quantity & Low Stock Alert section */}
        {hasInventory && (
          <div className={`mt-4 p-3.5 rounded-2xl border text-xs ${
            isOutOfStock
              ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : isLowStock
              ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-200'
          }`}>
            <div className="flex items-center justify-between font-semibold mb-1.5">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Remaining Quantity</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isOutOfStock && (
                  <span className="text-[10px] font-bold uppercase bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-100 px-1.5 py-0.5 rounded">
                    Out of Stock
                  </span>
                )}
                {isLowStock && (
                  <span className="text-[10px] font-bold uppercase bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-100 px-1.5 py-0.5 rounded">
                    Low Stock Alert
                  </span>
                )}
                <span className="font-bold tabular-nums">
                  {currentStock} / {bottleSize} {status.stockUnit}
                </span>
              </div>
            </div>

            {/* Inventory progress bar */}
            <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  isOutOfStock
                    ? 'bg-rose-500'
                    : isLowStock
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${stockPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-500 dark:text-stone-400">
                {isOutOfStock
                  ? 'Zero remaining! Refill immediately.'
                  : isLowStock
                  ? `Only ${currentStock} doses remaining.`
                  : `${stockPercent}% remaining in bottle`}
              </span>
              {onRefillStock && (
                <button
                  type="button"
                  onClick={() => onRefillStock(supplement.id)}
                  className="font-bold underline text-stone-800 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400"
                >
                  Refill Bottle
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottle Expiry Alert / Freshness Tracker */}
        {status.expiryStatus?.hasExpiry && (
          <div className={`mt-3 p-3 rounded-2xl border text-xs flex items-center justify-between ${
            status.expiryStatus.isExpired
              ? 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100 font-medium'
              : status.expiryStatus.isNearingExpiry
              ? 'bg-amber-50/90 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 font-medium'
              : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-200'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-3.5 h-3.5 shrink-0 ${
                status.expiryStatus.isExpired ? 'text-rose-600 dark:text-rose-400' : status.expiryStatus.isNearingExpiry ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500'
              }`} />
              <div>
                <span className="font-semibold">Expires:</span>{' '}
                <span className="font-mono">{supplement.expiryDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-bold">
              {status.expiryStatus.isExpired ? (
                <span className="text-[11px] bg-rose-200/80 dark:bg-rose-900 text-rose-900 dark:text-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-700 dark:text-rose-300" />
                  <span>Expired ({Math.abs(status.expiryStatus.daysUntilExpiry)}d ago)</span>
                </span>
              ) : status.expiryStatus.isNearingExpiry ? (
                <span className="text-[11px] bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-700 dark:text-amber-300" />
                  <span>{status.expiryStatus.daysUntilExpiry}d left</span>
                </span>
              ) : (
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  ✓ Fresh ({status.expiryStatus.daysUntilExpiry}d left)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Course Duration Timer (Auto-deactivates after specified period) */}
        {isFixedDuration && (
          <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-100 dark:border-stone-700">
            <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 mb-1.5 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                <span>
                  Course: {supplement.duration.periodValue} {supplement.duration.periodUnit}
                </span>
              </span>
              <span className="tabular-nums font-semibold text-stone-800 dark:text-stone-100">
                {isExpired ? '100% Finished' : `${status.coursePercent}% Complete`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  isExpired ? 'bg-stone-400' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, status.coursePercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mt-2">
              <span>Start: {supplement.duration.startDate}</span>
              <span>
                {isExpired
                  ? `Ended on ${supplement.duration.endDate}`
                  : `Ends on ${supplement.duration.endDate}`}
              </span>
            </div>

            {isExpired && (
              <div className="mt-2 pt-2 border-t border-stone-200/60 dark:border-stone-700 text-[11px] text-stone-500 dark:text-stone-400 leading-snug flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Period completed. Reminders and timer notifications automatically deactivated.</span>
              </div>
            )}
          </div>
        )}

        {/* Infinity / Lifetime Protocol Info */}
        {isInfinity && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800/80 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                <InfinityIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Lifetime Protocol (Infinity)</span>
              </span>
              <span className="text-[11px] font-mono text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/80 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                Active For Life
              </span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-200 mt-1.5 leading-relaxed">
              Permanent regimen. Reminders, schedule calculations, and stock alerts continue indefinitely without an end date.
            </p>
          </div>
        )}

        {/* Optional Physician/Personal notes */}
        {supplement.notes && (
          <div className="mt-3 text-xs text-stone-700 dark:text-stone-200 italic bg-stone-50 dark:bg-stone-800/80 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-700">
            "{supplement.notes}"
          </div>
        )}
      </div>

      {/* Footer Card Actions */}
      <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(supplement)}
            title="Edit supplement & schedule"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          
          <button
            onClick={() => onDelete(supplement.id)}
            title="Delete supplement protocol"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/80 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>

        <div>
          {isExpired ? (
            <button
              onClick={() => onRenewCourse(supplement)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Renew Course</span>
            </button>
          ) : (
            <button
              onClick={() => onQuickLog(supplement)}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl transition-colors"
            >
              Log Intake
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
