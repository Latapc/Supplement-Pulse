import React from 'react';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  Plus,
  TrendingUp,
} from 'lucide-react';
import type { Supplement, TodaySupplementStatus } from '../types/supplement';

type DashboardTab = 'today' | 'calendar' | 'supplements' | 'trends' | 'history';

interface DashboardOverviewProps {
  supplements: Supplement[];
  todayStatuses: TodaySupplementStatus[];
  onChangeTab: (tab: DashboardTab) => void;
  onAddSupplement: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  supplements,
  todayStatuses,
  onChangeTab,
  onAddSupplement,
}) => {
  const scheduled = todayStatuses.filter(
    (status) => status.isScheduledToday && status.isCourseActive && !status.supplement.archived,
  );
  const completed = scheduled.filter((status) => status.isFullyTaken).length;
  const remaining = Math.max(0, scheduled.length - completed);
  const progress = scheduled.length ? Math.round((completed / scheduled.length) * 100) : 0;
  const activeSupplements = supplements.filter((supplement) => !supplement.archived).length;
  const lowStockCount = todayStatuses.filter(
    (status) => status.isCourseActive && !status.supplement.archived && (status.isLowStock || status.isOutOfStock),
  ).length;

  const shortcuts: Array<{
    label: string;
    description: string;
    tab: DashboardTab;
    icon: React.ElementType;
  }> = [
    { label: 'Schedule', description: 'Review upcoming doses', tab: 'calendar', icon: CalendarDays },
    { label: 'Insights', description: 'Explore your trends', tab: 'trends', icon: TrendingUp },
    { label: 'Dose history', description: 'Review logged entries', tab: 'history', icon: Clock3 },
  ];

  return (
    <section
      aria-labelledby="daily-overview-title"
      className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)] gap-4 sm:gap-5"
    >
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/80 dark:border-emerald-900/70 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/80 dark:from-stone-900 dark:via-emerald-950/30 dark:to-teal-950/30 p-5 sm:p-6 shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-400/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-white/80 dark:bg-stone-900/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <Activity className="h-3.5 w-3.5" />
              Daily overview
            </div>
            <h2 id="daily-overview-title" className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              Your plan, at a glance
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-stone-600 dark:text-stone-300">
              Track what you have logged today and keep your supplement records organized.
            </p>
          </div>
          <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-2xl border border-emerald-200/80 dark:border-emerald-800/70 bg-white/80 dark:bg-stone-900/70">
            <div className="text-center">
              <div className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-300">{progress}%</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">logged</div>
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="text-stone-700 dark:text-stone-200">Today's scheduled items</span>
            <span className="text-stone-500 dark:text-stone-400">{completed} of {scheduled.length} complete</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-stone-800"
            role="progressbar"
            aria-label="Today's logged supplement schedule"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-white/80 dark:border-stone-700/80 bg-white/75 dark:bg-stone-900/55 p-3">
            <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-semibold">Completed</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold text-stone-900 dark:text-white">{completed}</div>
          </div>
          <div className="rounded-2xl border border-white/80 dark:border-stone-700/80 bg-white/75 dark:bg-stone-900/55 p-3">
            <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
              <Clock3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span className="text-[11px] font-semibold">Remaining</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold text-stone-900 dark:text-white">{remaining}</div>
          </div>
          <div className="rounded-2xl border border-white/80 dark:border-stone-700/80 bg-white/75 dark:bg-stone-900/55 p-3">
            <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
              <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-semibold">Low stock</span>
            </div>
            <div className="mt-1.5 text-2xl font-bold text-stone-900 dark:text-white">{lowStockCount}</div>
          </div>
        </div>

        {scheduled.length === 0 && (
          <p className="relative mt-4 text-xs leading-5 text-stone-600 dark:text-stone-300">
            Nothing is scheduled for today. You can review your plan or add an item when you are ready.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Workspace</p>
            <h2 className="mt-1 text-lg font-bold text-stone-900 dark:text-white">Quick actions</h2>
            <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">
              {activeSupplements} active {activeSupplements === 1 ? 'item' : 'items'} in your library
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <button
          type="button"
          onClick={onAddSupplement}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-left text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400 dark:focus-visible:ring-offset-stone-900"
        >
          <span className="flex items-center gap-2.5">
            <Plus className="h-4 w-4" />
            <span>
              <span className="block text-sm font-bold">Add an item</span>
              <span className="block text-[11px] text-white/70 dark:text-stone-950/75">Keep your list up to date</span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="mt-3 space-y-1">
          {shortcuts.map(({ label, description, tab, icon: Icon }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onChangeTab(tab)}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-stone-800/80"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 transition group-hover:border-emerald-200 group-hover:text-emerald-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:group-hover:border-emerald-800 dark:group-hover:text-emerald-300">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{label}</span>
                <span className="block text-xs text-stone-500 dark:text-stone-400">{description}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
