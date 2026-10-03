import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  CheckCircle2, 
  Award, 
  Activity, 
  Flame, 
  Filter, 
  Layers, 
  LineChart as LineChartIcon, 
  Percent, 
  CheckCircle, 
  AlertTriangle, 
  ChevronDown,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Supplement, DoseLog } from '../types/supplement';
import { formatDateToYYYYMMDD, isScheduledOnDate } from '../utils/dates';
import { SupplementCalendarView } from './SupplementCalendarView';

interface TrendsAndGraphsProps {
  supplements: Supplement[];
  logs: DoseLog[];
  currentDate: Date;
  initialSupplementId?: string;
  initialViewMode?: 'calendar' | 'analytics';
  onOpenEditModal?: (supplement: Supplement) => void;
  onQuickLog?: (supplement: Supplement, amount?: number, notes?: string) => void;
  onUpdateSupplement?: (supplement: Supplement) => void;
}

type AggregationPeriod = 'weekly' | 'monthly' | 'yearly' | 'daily';
type ChartType = 'bar' | 'line';

export const TrendsAndGraphs: React.FC<TrendsAndGraphsProps> = ({
  supplements,
  logs,
  currentDate,
  initialSupplementId = 'all',
  initialViewMode = 'calendar',
  onOpenEditModal,
  onQuickLog,
  onUpdateSupplement,
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'analytics'>(initialViewMode);
  const [period, setPeriod] = useState<AggregationPeriod>('weekly');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dailyRangeDays, setDailyRangeDays] = useState<7 | 14 | 30>(14);
  const [selectedSupplementId, setSelectedSupplementId] = useState<string>(initialSupplementId);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialSupplementId) {
      setSelectedSupplementId(initialSupplementId);
    }
  }, [initialSupplementId]);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const selectedSupplement = useMemo(() => {
    return supplements.find((s) => s.id === selectedSupplementId);
  }, [supplements, selectedSupplementId]);

  // DAILY Aggregation (7D, 14D, 30D)
  const dailyData = useMemo(() => {
    const list = [];
    for (let i = dailyRangeDays - 1; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - i);
      const str = formatDateToYYYYMMDD(d);

      const activeSupps = supplements.filter((s) => {
        if (selectedSupplementId !== 'all' && s.id !== selectedSupplementId) return false;
        return isScheduledOnDate(s, d);
      });

      const dayLogs = logs.filter((l) => {
        if (l.date !== str) return false;
        if (selectedSupplementId !== 'all' && l.supplementId !== selectedSupplementId) return false;
        return true;
      });

      const totalAmountTaken = dayLogs.reduce((acc, l) => acc + l.amountTaken, 0);
      const scheduledCount = activeSupps.length;
      const takenCount = dayLogs.length;

      let adherence = 100;
      if (scheduledCount > 0) {
        adherence = Math.min(100, Math.round((takenCount / scheduledCount) * 100));
      } else if (takenCount > 0) {
        adherence = 100; // Unscheduled bonus
      }

      list.push({
        key: str,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        subLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
        scheduledCount,
        takenCount,
        adherence,
        totalAmountTaken,
        unit: selectedSupplement?.unit || (dayLogs[0]?.unit ?? ''),
        logs: dayLogs,
      });
    }
    return list;
  }, [dailyRangeDays, currentDate, supplements, logs, selectedSupplementId, selectedSupplement]);

  // WEEKLY Aggregation (Past 10 weeks)
  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let w = 9; w >= 0; w--) {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(startOfWeek.getDate() - (w * 7 + startOfWeek.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const startStr = formatDateToYYYYMMDD(startOfWeek);
      const endStr = formatDateToYYYYMMDD(endOfWeek);

      const weekLogs = logs.filter((l) => {
        if (selectedSupplementId !== 'all' && l.supplementId !== selectedSupplementId) return false;
        return l.date >= startStr && l.date <= endStr;
      });

      let scheduledCount = 0;
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const curD = new Date(startOfWeek);
        curD.setDate(curD.getDate() + dayOffset);
        supplements.forEach((s) => {
          if (selectedSupplementId !== 'all' && s.id !== selectedSupplementId) return;
          if (isScheduledOnDate(s, curD)) {
            scheduledCount++;
          }
        });
      }

      const totalAmountTaken = weekLogs.reduce((acc, l) => acc + l.amountTaken, 0);
      const takenCount = weekLogs.length;
      const adherence = scheduledCount > 0 ? Math.min(100, Math.round((takenCount / scheduledCount) * 100)) : 100;

      weeks.push({
        key: `W-${w}`,
        label: `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        subLabel: `to ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        scheduledCount,
        takenCount,
        adherence,
        totalAmountTaken,
        unit: selectedSupplement?.unit || (weekLogs[0]?.unit ?? ''),
        logs: weekLogs,
      });
    }
    return weeks;
  }, [currentDate, logs, supplements, selectedSupplementId, selectedSupplement]);

  // MONTHLY Aggregation (Past 12 months)
  const monthlyData = useMemo(() => {
    const months = [];
    for (let m = 11; m >= 0; m--) {
      const targetMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - m, 1);
      const year = targetMonth.getFullYear();
      const monthIdx = targetMonth.getMonth();
      const monthPrefix = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

      const monthLogs = logs.filter((l) => {
        if (selectedSupplementId !== 'all' && l.supplementId !== selectedSupplementId) return false;
        return l.date.startsWith(monthPrefix);
      });

      const totalAmountTaken = monthLogs.reduce((acc, l) => acc + l.amountTaken, 0);
      const takenCount = monthLogs.length;

      // Scheduled count in that month
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
      let scheduledCount = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, monthIdx, day);
        supplements.forEach((s) => {
          if (selectedSupplementId !== 'all' && s.id !== selectedSupplementId) return;
          if (isScheduledOnDate(s, d)) {
            scheduledCount++;
          }
        });
      }

      const adherence = scheduledCount > 0 ? Math.min(100, Math.round((takenCount / scheduledCount) * 100)) : 100;

      months.push({
        key: monthPrefix,
        label: targetMonth.toLocaleDateString('en-US', { month: 'short' }),
        subLabel: `${year}`,
        scheduledCount,
        takenCount,
        adherence,
        totalAmountTaken,
        unit: selectedSupplement?.unit || (monthLogs[0]?.unit ?? ''),
        logs: monthLogs,
      });
    }
    return months;
  }, [currentDate, logs, supplements, selectedSupplementId, selectedSupplement]);

  // YEARLY Aggregation (Past 3 Years)
  const yearlyData = useMemo(() => {
    const years = [];
    const currentYear = currentDate.getFullYear();
    for (let y = 2; y >= 0; y--) {
      const targetYear = currentYear - y;
      const yearPrefix = `${targetYear}`;

      const yearLogs = logs.filter((l) => {
        if (selectedSupplementId !== 'all' && l.supplementId !== selectedSupplementId) return false;
        return l.date.startsWith(yearPrefix);
      });

      const totalAmountTaken = yearLogs.reduce((acc, l) => acc + l.amountTaken, 0);
      const takenCount = yearLogs.length;

      // Estimate scheduled doses for active supplements across the year
      let scheduledCount = 0;
      const daysInYear = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0 ? 366 : 365;
      
      // Compute sampling
      for (let dayOffset = 0; dayOffset < daysInYear; dayOffset += 1) {
        const d = new Date(targetYear, 0, dayOffset + 1);
        if (d > currentDate) break; // Don't project future days in current year
        supplements.forEach((s) => {
          if (selectedSupplementId !== 'all' && s.id !== selectedSupplementId) return;
          if (isScheduledOnDate(s, d)) {
            scheduledCount++;
          }
        });
      }

      const adherence = scheduledCount > 0 ? Math.min(100, Math.round((takenCount / scheduledCount) * 100)) : 100;

      years.push({
        key: `Y-${targetYear}`,
        label: `${targetYear}`,
        subLabel: 'Annual',
        scheduledCount,
        takenCount,
        adherence,
        totalAmountTaken,
        unit: selectedSupplement?.unit || (yearLogs[0]?.unit ?? ''),
        logs: yearLogs,
      });
    }
    return years;
  }, [currentDate, logs, supplements, selectedSupplementId, selectedSupplement]);

  // Current dataset based on period
  const activeDataset = useMemo(() => {
    switch (period) {
      case 'weekly':
        return weeklyData;
      case 'monthly':
        return monthlyData;
      case 'yearly':
        return yearlyData;
      case 'daily':
      default:
        return dailyData;
    }
  }, [period, weeklyData, monthlyData, yearlyData, dailyData]);

  // Max value calculation for chart scaling
  const maxBarValue = Math.max(
    1,
    ...activeDataset.map((d) => Math.max(d.scheduledCount, d.takenCount))
  );

  // Overall metrics calculation
  const metrics = useMemo(() => {
    const totalScheduled = activeDataset.reduce((acc, d) => acc + d.scheduledCount, 0);
    const totalTaken = activeDataset.reduce((acc, d) => acc + Math.min(d.takenCount, d.scheduledCount), 0);
    const totalLogsCount = activeDataset.reduce((acc, d) => acc + d.takenCount, 0);
    const overallAdherence = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;

    let streak = 0;
    for (let i = dailyData.length - 1; i >= 0; i--) {
      const d = dailyData[i];
      if (d.scheduledCount > 0) {
        if (d.takenCount >= d.scheduledCount) {
          streak++;
        } else {
          break;
        }
      }
    }

    const totalDosageQuantity = activeDataset.reduce((sum, d) => sum + d.totalAmountTaken, 0);

    return {
      overallAdherence,
      streak,
      totalScheduled,
      totalTaken,
      totalLogsCount,
      totalDosageQuantity,
    };
  }, [activeDataset, dailyData]);

  // Individual supplement adherence ranking
  const supplementAdherenceList = useMemo(() => {
    return supplements.map((s) => {
      const suppLogs = logs.filter((l) => l.supplementId === s.id);
      let scheduledCount = 0;
      for (let i = 29; i >= 0; i--) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - i);
        if (isScheduledOnDate(s, d)) scheduledCount++;
      }
      const takenCount = suppLogs.filter((l) => {
        const d = new Date(l.date);
        const diff = (currentDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 30;
      }).length;

      const rate = scheduledCount > 0 ? Math.min(100, Math.round((takenCount / scheduledCount) * 100)) : 100;
      return {
        supplement: s,
        scheduledCount,
        takenCount,
        rate,
      };
    });
  }, [supplements, logs, currentDate]);

  // SVG Line Chart coordinates calculation
  const lineChartPoints = useMemo(() => {
    const width = 800;
    const height = 220;
    const paddingX = 40;
    const paddingY = 30;

    if (activeDataset.length === 0) {
      return { takenPoints: '', scheduledPoints: '', points: [], width, height, paddingX, paddingY };
    }

    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;
    const stepX = activeDataset.length > 1 ? usableWidth / (activeDataset.length - 1) : usableWidth / 2;

    const points = activeDataset.map((item, idx) => {
      const x = paddingX + idx * stepX;
      const yTaken = paddingY + usableHeight - (item.takenCount / maxBarValue) * usableHeight;
      const yScheduled = paddingY + usableHeight - (item.scheduledCount / maxBarValue) * usableHeight;
      return {
        x,
        yTaken: isNaN(yTaken) ? paddingY + usableHeight : yTaken,
        yScheduled: isNaN(yScheduled) ? paddingY + usableHeight : yScheduled,
        item,
        idx,
      };
    });

    const takenPoints = points.map((p) => `${p.x},${p.yTaken}`).join(' ');
    const scheduledPoints = points.map((p) => `${p.x},${p.yScheduled}`).join(' ');

    return { takenPoints, scheduledPoints, points, width, height, paddingX, paddingY };
  }, [activeDataset, maxBarValue]);

  return (
    <div className="space-y-6">
      
      {/* View Mode Switcher: Calendar Schedule Matrix vs Analytics & Charts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white font-display">
            {viewMode === 'calendar' ? 'Supplement Schedule & Google Calendar' : 'Consumption Analytics & Intake Trends'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            {viewMode === 'calendar'
              ? 'View monthly intake schedule, verify scheduled intake days for Vitamin D3 & your stash, and sync with Google Calendar'
              : 'Interactive multi-period adherence charts (Daily, Weekly, Monthly, Yearly) with planned schedule metrics'}
          </p>
        </div>

        <div className="flex items-center p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-stone-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-blue-500" />
            <span>Calendar Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
              viewMode === 'analytics'
                ? 'bg-white dark:bg-stone-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-emerald-500" />
            <span>Adherence Charts</span>
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <SupplementCalendarView
          supplements={supplements}
          logs={logs}
          currentDate={currentDate}
          initialSelectedSupplementId={selectedSupplementId}
          onOpenEditModal={onOpenEditModal}
          onQuickLog={onQuickLog}
          onUpdateSupplement={onUpdateSupplement}
        />
      ) : (
        <>
          {/* Top Filter & Aggregation Switcher Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Intake Fulfillment & Adherence Graphs
              </h3>
              <p className="text-xs text-stone-500">
                Compare actual taken doses vs planned schedules over custom time horizons
              </p>
            </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Toggle: Bar Chart vs Line Graph */}
          <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200">
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                chartType === 'bar'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bar Chart</span>
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                chartType === 'line'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Line Graph</span>
            </button>
          </div>

          {/* Aggregation Period: Weekly, Monthly, Yearly, Daily */}
          <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200">
            {(['weekly', 'monthly', 'yearly', 'daily'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                  period === p
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Supplement Filter Dropdown */}
          <select
            value={selectedSupplementId}
            onChange={(e) => setSelectedSupplementId(e.target.value)}
            className="h-9 px-3 rounded-xl border border-stone-300 text-xs font-medium text-stone-800 bg-white"
          >
            <option value="all">All Supplements (Cumulative)</option>
            {supplements.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.doseAmount.toLocaleString()} {s.unit})
              </option>
            ))}
          </select>

          {/* If daily mode: allow 7D, 14D, 30D range */}
          {period === 'daily' && (
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200">
              {([7, 14, 30] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDailyRangeDays(r)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    dailyRangeDays === r
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {r}D
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Schedule Adherence</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display tabular-nums">
            {metrics.overallAdherence}%
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {metrics.totalTaken} of {metrics.totalScheduled} planned doses taken
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Consistency Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-display tabular-nums">
            {metrics.streak}{' '}
            <span className="text-sm font-semibold text-stone-500">days</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Consecutive daily targets achieved
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Doses Consumed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-display tabular-nums">
            {metrics.totalLogsCount}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Total intakes in selected {period} period
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Cumulative Volume</span>
            <Award className="w-4 h-4 text-stone-700" />
          </div>
          <div 
            title={`${metrics.totalDosageQuantity.toLocaleString()} ${selectedSupplement?.unit || 'units'}`}
            className="text-base sm:text-xl font-extrabold text-stone-900 dark:text-white font-display tabular-nums break-words leading-tight"
          >
            {metrics.totalDosageQuantity >= 1000000
              ? `${(metrics.totalDosageQuantity / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
              : metrics.totalDosageQuantity >= 10000
              ? `${(metrics.totalDosageQuantity / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`
              : metrics.totalDosageQuantity.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              {selectedSupplement?.unit || 'units'}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Active period consumed amount
          </p>
        </div>
      </div>

      {/* Main Interactive Graph Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 font-display capitalize">
                {period} Intake Trends vs Planned Schedule
              </h3>
              {selectedSupplement && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg">
                  {selectedSupplement.name}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Visualize doses taken against planned schedule across {period} intervals
            </p>
          </div>

          {/* Graph Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500" />
              <span className="text-stone-700 font-medium">Doses Taken</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-stone-300" />
              <span className="text-stone-500 font-medium">Planned Schedule</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-stone-600 font-medium">Adherence Target</span>
            </div>
          </div>
        </div>

        {/* Chart View Rendering: Bar Chart or Line Graph */}
        {chartType === 'bar' ? (
          /* BAR CHART VIEW */
          <div className="relative pt-4 pb-2">
            <div className="h-64 flex items-end gap-2 sm:gap-3 overflow-x-auto pb-8">
              {activeDataset.map((item, index) => {
                const isHovered = hoveredIndex === index;
                const hasScheduled = item.scheduledCount > 0;
                
                const heightPercentTaken = hasScheduled
                  ? Math.min(100, Math.max(12, (item.takenCount / maxBarValue) * 100))
                  : item.takenCount > 0
                  ? 30
                  : 6;

                const heightPercentScheduled = hasScheduled
                  ? Math.min(100, Math.max(12, (item.scheduledCount / maxBarValue) * 100))
                  : 6;

                const isComplete = hasScheduled && item.takenCount >= item.scheduledCount;
                const isPartial = hasScheduled && item.takenCount > 0 && item.takenCount < item.scheduledCount;
                const isMissed = hasScheduled && item.takenCount === 0;

                return (
                  <div
                    key={item.key}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="flex-1 min-w-[28px] sm:min-w-[42px] max-w-[68px] flex flex-col items-center justify-end h-full relative group cursor-pointer"
                  >
                    {/* Dual-bar representation (Planned vs Taken) */}
                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {/* Scheduled Planned Bar */}
                      <div
                        className="w-1/2 rounded-t-md bg-stone-200 transition-all duration-200"
                        style={{
                          height: `${heightPercentScheduled}%`,
                          opacity: isHovered ? 1 : 0.75,
                        }}
                        title={`Planned: ${item.scheduledCount}`}
                      />

                      {/* Actual Taken Bar */}
                      <div
                        className="w-1/2 rounded-t-md transition-all duration-200 flex items-end justify-center"
                        style={{
                          height: `${heightPercentTaken}%`,
                          backgroundColor: isComplete
                            ? '#10B981'
                            : isPartial
                            ? '#F59E0B'
                            : isMissed
                            ? '#EF4444'
                            : item.takenCount > 0
                            ? '#059669'
                            : '#E7E5E4',
                          opacity: isHovered ? 1 : 0.9,
                          transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                          transformOrigin: 'bottom',
                        }}
                      >
                        {item.takenCount > 0 && (
                          <span className="text-[9px] font-bold text-white mb-1 tabular-nums">
                            {item.takenCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Label underneath */}
                    <div className="absolute -bottom-7 text-center whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-stone-700 block leading-tight">
                        {item.label}
                      </span>
                      <span className="text-[9px] text-stone-400 block leading-none">
                        {item.subLabel}
                      </span>
                    </div>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-3 z-30 bg-stone-900 text-white text-xs rounded-xl p-3 shadow-xl min-w-[210px] pointer-events-none">
                        <div className="font-bold text-white text-xs border-b border-stone-800 pb-1 mb-1.5 flex items-center justify-between">
                          <span>{item.label} ({item.subLabel})</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.adherence >= 90 ? 'bg-emerald-800 text-emerald-200' : item.adherence >= 60 ? 'bg-amber-800 text-amber-200' : 'bg-rose-900 text-rose-200'
                          }`}>
                            {item.adherence}% Adherent
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-stone-300">
                          <div className="flex items-center justify-between">
                            <span>Doses Taken:</span>
                            <span className="font-bold text-white tabular-nums">
                              {item.takenCount} doses
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Planned Schedule:</span>
                            <span className="font-semibold text-stone-400 tabular-nums">
                              {item.scheduledCount} doses
                            </span>
                          </div>
                          {item.totalAmountTaken > 0 && (
                            <div className="flex items-center justify-between pt-1 border-t border-stone-800">
                              <span>Volume Consumed:</span>
                              <span className="font-bold text-emerald-400 tabular-nums">
                                {item.totalAmountTaken.toLocaleString()} {item.unit}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* LINE GRAPH VIEW */
          <div className="relative pt-4 pb-8 overflow-x-auto">
            <svg
              viewBox={`0 0 ${lineChartPoints.width} ${lineChartPoints.height}`}
              className="w-full h-64 overflow-visible"
            >
              <defs>
                <linearGradient id="lineGradientTaken" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = lineChartPoints.paddingY + (lineChartPoints.height - lineChartPoints.paddingY * 2) * ratio;
                return (
                  <line
                    key={i}
                    x1={lineChartPoints.paddingX}
                    y1={y}
                    x2={lineChartPoints.width - lineChartPoints.paddingX}
                    y2={y}
                    stroke="#E7E5E4"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Area fill for actual taken doses */}
              {lineChartPoints.points.length > 0 && (
                <polygon
                  points={`
                    ${lineChartPoints.points[0].x},${lineChartPoints.height - lineChartPoints.paddingY}
                    ${lineChartPoints.takenPoints}
                    ${lineChartPoints.points[lineChartPoints.points.length - 1].x},${lineChartPoints.height - lineChartPoints.paddingY}
                  `}
                  fill="url(#lineGradientTaken)"
                />
              )}

              {/* Scheduled Planned Line (dashed gray) */}
              <polyline
                fill="none"
                stroke="#A8A29E"
                strokeWidth="2"
                strokeDasharray="5 5"
                points={lineChartPoints.scheduledPoints}
              />

              {/* Actual Taken Line (solid emerald) */}
              <polyline
                fill="none"
                stroke="#059669"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={lineChartPoints.takenPoints}
              />

              {/* Data points & Interactive Hover Circles */}
              {lineChartPoints.points.map((p) => {
                const isHovered = hoveredIndex === p.idx;
                return (
                  <g key={p.item.key} className="cursor-pointer">
                    {/* Scheduled circle */}
                    <circle
                      cx={p.x}
                      cy={p.yScheduled}
                      r="4"
                      fill="#A8A29E"
                    />

                    {/* Taken circle */}
                    <circle
                      cx={p.x}
                      cy={p.yTaken}
                      r={isHovered ? 7 : 5}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredIndex(p.idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Bottom Label text */}
                    <text
                      x={p.x}
                      y={lineChartPoints.height - 8}
                      textAnchor="middle"
                      className="text-[10px] fill-stone-600 font-semibold"
                    >
                      {p.item.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Active Tooltip for Line Chart */}
            {hoveredIndex !== null && activeDataset[hoveredIndex] && (
              <div className="mt-3 p-3 bg-stone-900 text-white text-xs rounded-xl flex items-center justify-between max-w-md mx-auto shadow-md">
                <span className="font-bold">
                  {activeDataset[hoveredIndex].label} ({activeDataset[hoveredIndex].subLabel}):
                </span>
                <span className="text-emerald-400 font-semibold">
                  {activeDataset[hoveredIndex].takenCount} Taken / {activeDataset[hoveredIndex].scheduledCount} Planned
                </span>
                <span className="text-stone-300">
                  Adherence: <strong className="text-white">{activeDataset[hoveredIndex].adherence}%</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adherence Breakdown by Regimen */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 font-display">
              Supplement Adherence Breakdown (Past 30 Days)
            </h3>
            <p className="text-xs text-stone-500">
              Individual adherence ratings compared against each supplement's target schedule
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {supplementAdherenceList.map(({ supplement, scheduledCount, takenCount, rate }) => {
            const isHigh = rate >= 85;
            const isModerate = rate >= 60 && rate < 85;

            return (
              <div
                key={supplement.id}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">
                      {supplement.name}
                    </h4>
                    <p className="text-xs text-stone-500">
                      {supplement.doseAmount.toLocaleString()} {supplement.unit} · {supplement.frequencyType}
                    </p>
                  </div>

                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                    isHigh
                      ? 'bg-emerald-100 text-emerald-800'
                      : isModerate
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isHigh ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{rate}%</span>
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-stone-600 mb-1">
                    <span>Fulfillment</span>
                    <span className="font-semibold tabular-nums">
                      {takenCount} of {scheduledCount} scheduled doses
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isHigh ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}

    </div>
  );
};
