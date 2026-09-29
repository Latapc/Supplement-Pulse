import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { TodaySupplementStatus } from '../types/supplement';
import { formatCountdown } from '../utils/dates';

interface HeroBannerProps {
  todayStatuses: TodaySupplementStatus[];
  currentDate: Date;
  onOpenAddModal: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  todayStatuses,
  currentDate,
  onOpenAddModal,
}) => {
  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const scheduledToday = todayStatuses.filter((s) => s.isScheduledToday);
  const remainingToday = scheduledToday.filter((s) => !s.isFullyTaken);
  const completedToday = scheduledToday.filter((s) => s.isFullyTaken);

  // Find nearest upcoming dose
  const sortedUpcoming = [...todayStatuses]
    .filter((s) => s.isCourseActive)
    .sort((a, b) => a.nextScheduledDateTime.getTime() - b.nextScheduledDateTime.getTime());

  const nearestDose = sortedUpcoming[0];

  return (
    <section className="relative overflow-hidden rounded-2xl bg-stone-900 text-stone-100 shadow-sm border border-stone-800">
      {/* Background with image & subtle dark scrim */}
      <div className="absolute inset-0 z-0 opacity-25">
        <img
          src="/src/assets/images/hero_supplement_apothecary_1790166469442.jpg"
          alt="Apothecary supplement bottles on natural stone"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-900/90 to-stone-900/60" />
      </div>

      <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left Side: Editorial Date & Status */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{dayName}</span>
            <span aria-hidden="true">·</span>
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Regimen Active</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white font-display mb-3">
            {remainingToday.length === 0 && scheduledToday.length > 0 ? (
              <span>All Doses Completed for Today</span>
            ) : remainingToday.length === 1 ? (
              <span>
                {remainingToday[0].remainingDoseToday.toLocaleString()} {remainingToday[0].supplement.unit} of{' '}
                {remainingToday[0].supplement.name.split('(')[0].trim()} Left Today
              </span>
            ) : remainingToday.length > 1 ? (
              <span>{remainingToday.length} Supplement Doses Remaining Today</span>
            ) : (
              <span>No Doses Scheduled for Today</span>
            )}
          </h1>

          <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
            {remainingToday.length > 0 ? (
              <span>
                Track and log your daily protocol targets smoothly at your own pace.
              </span>
            ) : scheduledToday.length > 0 ? (
              <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Great job! You have satisfied 100% of your daily protocol targets today.
              </span>
            ) : (
              <span>Your scheduled weekly regimen is on rest mode today. Next doses will automatically alert you.</span>
            )}
          </p>
        </div>

        {/* Right Side: Key Quick Snapshot Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0 lg:min-w-[340px]">
          {/* Due Today */}
          <div className="bg-stone-800/80 backdrop-blur-sm border border-stone-700/60 rounded-xl p-3.5">
            <div className="text-xs text-stone-400 mb-1 font-medium">Left Today</div>
            <div className="text-2xl font-bold font-display text-white tabular-nums">
              {remainingToday.length}
              <span className="text-xs font-normal text-stone-400 ml-1.5">
                / {scheduledToday.length} due
              </span>
            </div>
            <div className="mt-1 text-[11px] text-stone-400">
              {completedToday.length} taken today
            </div>
          </div>

          {/* Active Regimens */}
          <div className="bg-stone-800/80 backdrop-blur-sm border border-stone-700/60 rounded-xl p-3.5">
            <div className="text-xs text-stone-400 mb-1 font-medium">Active Courses</div>
            <div className="text-2xl font-bold font-display text-white tabular-nums">
              {todayStatuses.filter((s) => s.isCourseActive).length}
            </div>
            <div className="mt-1 text-[11px] text-stone-400">
              {todayStatuses.filter((s) => s.isCourseExpired).length} completed
            </div>
          </div>

          {/* Next Dose Timer */}
          <div className="col-span-2 sm:col-span-1 bg-stone-800/80 backdrop-blur-sm border border-stone-700/60 rounded-xl p-3.5">
            <div className="text-xs text-stone-400 mb-1 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Next Dose</span>
            </div>
            <div className="text-lg font-bold font-display text-emerald-300 tabular-nums truncate">
              {nearestDose ? formatCountdown(nearestDose.nextScheduledDateTime, currentDate) : 'None'}
            </div>
            <div className="mt-1 text-[11px] text-stone-300 truncate">
              {nearestDose ? nearestDose.supplement.name.split('(')[0] : 'All caught up'}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
