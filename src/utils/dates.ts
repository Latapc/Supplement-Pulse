import { Supplement, DoseLog, TodaySupplementStatus, DayOfWeek, CyclePhaseInfo, ExpiryStatusInfo } from '../types/supplement';

export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseYYYYMMDD(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function getDayName(dayIndex: DayOfWeek): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names[dayIndex];
}

export function getDayShortName(dayIndex: DayOfWeek): string {
  const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return shortNames[dayIndex];
}

/**
 * Calculates end date given a start date and period value + unit.
 */
export function calculateEndDate(startDateStr: string, periodValue: number, periodUnit: 'days' | 'weeks' | 'months'): string {
  const date = parseYYYYMMDD(startDateStr);
  if (periodUnit === 'days') {
    date.setDate(date.getDate() + periodValue);
  } else if (periodUnit === 'weeks') {
    date.setDate(date.getDate() + periodValue * 7);
  } else if (periodUnit === 'months') {
    date.setMonth(date.getMonth() + periodValue);
  }
  return formatDateToYYYYMMDD(date);
}

/**
 * Determines if a supplement course is active, pending start, or expired.
 */
export function getCourseStatus(supp: Supplement, currentDate: Date = new Date()) {
  const todayStr = formatDateToYYYYMMDD(currentDate);
  const start = supp.duration.startDate;
  const isBeforeStart = todayStr < start;
  
  if (supp.duration.type === 'continuous' || supp.duration.type === 'infinity') {
    return {
      isCourseActive: !isBeforeStart,
      isCourseExpired: false,
      isBeforeStart,
      isInfinity: supp.duration.type === 'infinity',
      daysRemaining: Infinity,
      totalDays: Infinity,
      elapsedDays: 0,
      percentComplete: 0,
      endDate: null,
    };
  }

  const end = supp.duration.endDate || calculateEndDate(start, supp.duration.periodValue || 1, supp.duration.periodUnit || 'months');
  const isExpired = todayStr > end;
  const isCourseActive = !isBeforeStart && !isExpired;

  const startDateObj = parseYYYYMMDD(start);
  const endDateObj = parseYYYYMMDD(end);
  const currentDateClean = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  const totalTime = endDateObj.getTime() - startDateObj.getTime();
  const totalDays = Math.max(1, Math.round(totalTime / (1000 * 60 * 60 * 24)));
  
  const remainingTime = endDateObj.getTime() - currentDateClean.getTime();
  const daysRemaining = Math.max(0, Math.ceil(remainingTime / (1000 * 60 * 60 * 24)));

  const elapsedTime = currentDateClean.getTime() - startDateObj.getTime();
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round(elapsedTime / (1000 * 60 * 60 * 24))));

  const percentComplete = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return {
    isCourseActive,
    isCourseExpired: isExpired,
    isBeforeStart,
    isInfinity: false,
    daysRemaining,
    totalDays,
    elapsedDays,
    percentComplete,
    endDate: end,
  };
}

/**
 * Calculates current cycle phase (e.g. Boron 2 weeks ON, 1 week OFF).
 */
export function getCyclePhase(
  supp: Supplement,
  targetDate: Date = new Date()
): CyclePhaseInfo | null {
  if (!supp.cycleConfig?.isCyclic) return null;
  const onDays = Math.max(1, supp.cycleConfig.onDays || 14);
  const offDays = Math.max(1, supp.cycleConfig.offDays || 7);
  const startStr = supp.cycleConfig.cycleStartDate || supp.duration.startDate;
  const start = parseYYYYMMDD(startStr);
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const daysUntil = Math.abs(diffDays);
    return {
      inActivePhase: false,
      phaseDay: 0,
      totalPhaseDays: onDays,
      daysUntilNextPhase: daysUntil,
      phaseLabel: `Starts in ${daysUntil}d`,
    };
  }

  const cycleLength = onDays + offDays;
  const dayInCycle = diffDays % cycleLength;

  if (dayInCycle < onDays) {
    const phaseDay = dayInCycle + 1;
    const remaining = onDays - dayInCycle;
    return {
      inActivePhase: true,
      phaseDay,
      totalPhaseDays: onDays,
      daysUntilNextPhase: remaining,
      phaseLabel: `Active Phase: Day ${phaseDay} of ${onDays} (${remaining}d left in cycle)`,
    };
  } else {
    const phaseDay = (dayInCycle - onDays) + 1;
    const remaining = cycleLength - dayInCycle;
    return {
      inActivePhase: false,
      phaseDay,
      totalPhaseDays: offDays,
      daysUntilNextPhase: remaining,
      phaseLabel: `Rest Break: Day ${phaseDay} of ${offDays} (${remaining}d until restart)`,
    };
  }
}

/**
 * Checks if today is a scheduled dosing day for this supplement.
 */
export function isScheduledOnDate(supp: Supplement, targetDate: Date = new Date()): boolean {
  const course = getCourseStatus(supp, targetDate);
  if (!course.isCourseActive) {
    return false;
  }

  // Check special cyclic schedule (e.g. Boron 2 weeks ON, 1 week OFF)
  if (supp.cycleConfig?.isCyclic) {
    const cycle = getCyclePhase(supp, targetDate);
    if (cycle && !cycle.inActivePhase) {
      return false; // Currently in rest break!
    }
  }

  const dayOfWeek = targetDate.getDay() as DayOfWeek;

  if (supp.frequencyType === 'daily') {
    return true;
  }

  if (supp.frequencyType === 'weekly') {
    const days = supp.selectedDays || [1]; // default Monday
    return days.includes(dayOfWeek);
  }

  if (supp.frequencyType === 'monthly') {
    const targetDayOfMonth = supp.monthlyDayOfMonth || 1;
    return targetDate.getDate() === targetDayOfMonth;
  }

  if (supp.frequencyType === 'interval') {
    const startDate = parseYYYYMMDD(supp.duration.startDate);
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffDays = Math.round((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const interval = supp.intervalDays || 1;
    return diffDays >= 0 && diffDays % interval === 0;
  }

  return false;
}

/**
 * Calculates the exact next scheduled date and time for a supplement.
 */
export function getNextScheduledDose(supp: Supplement, fromDate: Date = new Date()): Date | null {
  const course = getCourseStatus(supp, fromDate);
  if (course.isCourseExpired) return null;

  const [hours, minutes] = (supp.doseTime || '09:00').split(':').map(Number);
  
  // Check up to 60 days ahead
  for (let i = 0; i < 60; i++) {
    const candidateDate = new Date(fromDate);
    candidateDate.setDate(candidateDate.getDate() + i);
    candidateDate.setHours(hours, minutes, 0, 0);

    // If it's today but the time has already passed, skip today
    if (i === 0 && candidateDate.getTime() <= fromDate.getTime()) {
      continue;
    }

    if (isScheduledOnDate(supp, candidateDate)) {
      return candidateDate;
    }
  }

  return null;
}

/**
 * Formats a duration countdown string (e.g. "2h 45m" or "In 3 days").
 */
export function formatCountdown(targetDate: Date, now: Date = new Date()): string {
  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) return 'Due right now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remHours = diffHours % 24;
    return `${diffDays}d ${remHours}h`;
  }
  if (diffHours > 0) {
    const remMin = diffMin % 60;
    return `${diffHours}h ${remMin}m`;
  }
  if (diffMin > 0) {
    const remSec = diffSec % 60;
    return `${diffMin}m ${remSec}s`;
  }
  return `${diffSec}s`;
}

/**
 * Calculates supplement expiration status:
 * - Expired: target date is past expiryDate
 * - Nearing expiry: within 30 days of expiryDate
 * - Caution: within 60 days
 * - Good: > 60 days
 */
export function getExpiryStatus(
  supp: Supplement,
  targetDate: Date = new Date()
): ExpiryStatusInfo {
  if (!supp.expiryDate) {
    return {
      hasExpiry: false,
      isExpired: false,
      isNearingExpiry: false,
      daysUntilExpiry: Infinity,
      formattedText: 'No expiry set',
      badgeVariant: 'none',
    };
  }

  const expDateObj = parseYYYYMMDD(supp.expiryDate);
  const targetClean = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffMs = expDateObj.getTime() - targetClean.getTime();
  const daysUntilExpiry = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isExpired = daysUntilExpiry < 0;
  const isNearingExpiry = !isExpired && daysUntilExpiry <= 30;
  const isCaution = !isExpired && !isNearingExpiry && daysUntilExpiry <= 60;

  let formattedText = '';
  let badgeVariant: ExpiryStatusInfo['badgeVariant'] = 'good';

  if (isExpired) {
    badgeVariant = 'expired';
    const daysAgo = Math.abs(daysUntilExpiry);
    formattedText = daysAgo === 0 ? 'Expires today!' : `Expired ${daysAgo}d ago (${supp.expiryDate})`;
  } else if (isNearingExpiry) {
    badgeVariant = 'warning';
    formattedText = `Expires in ${daysUntilExpiry}d (${supp.expiryDate})`;
  } else if (isCaution) {
    badgeVariant = 'caution';
    formattedText = `Expires in ${daysUntilExpiry}d`;
  } else {
    badgeVariant = 'good';
    formattedText = `Good until ${supp.expiryDate}`;
  }

  return {
    hasExpiry: true,
    expiryDate: supp.expiryDate,
    isExpired,
    isNearingExpiry,
    daysUntilExpiry,
    formattedText,
    badgeVariant,
  };
}

/**
 * Computes today's exact status for a supplement including remaining doses and inventory.
 */
export function calculateTodayStatus(
  supp: Supplement,
  todayLogs: DoseLog[],
  now: Date = new Date(),
  dismissedTodayIds: string[] = []
): TodaySupplementStatus {
  const course = getCourseStatus(supp, now);
  const originallyScheduled = isScheduledOnDate(supp, now);
  const isDismissed = dismissedTodayIds.includes(supp.id);
  const isScheduled = originallyScheduled && !isDismissed;
  
  // Total logged today
  const logsForSupp = todayLogs.filter(l => l.supplementId === supp.id);
  const totalTaken = logsForSupp.reduce((acc, l) => acc + (l.amountTaken || 0), 0);
  
  const totalScheduled = isScheduled ? supp.doseAmount : 0;
  const remainingDoseToday = Math.max(0, totalScheduled - totalTaken);
  const isFullyTaken = isScheduled && remainingDoseToday === 0;

  const nextDose = getNextScheduledDose(supp, now);
  const nextDoseCountdownText = nextDose ? formatCountdown(nextDose, now) : 'None';

  // Inventory / Stock Calculation
  const trackStock = supp.inventory?.trackStock ?? false;
  const currentStock = supp.inventory?.currentStock ?? 0;
  const lowThreshold = supp.inventory?.lowStockThreshold ?? 7;
  const isOutOfStock = trackStock && currentStock <= 0;
  const isLowStock = trackStock && !isOutOfStock && currentStock <= lowThreshold;

  // Expiry date calculation
  const expiryStatus = getExpiryStatus(supp, now);

  const cyclePhase = getCyclePhase(supp, now);
  const isInfinity = supp.duration.type === 'infinity' || supp.duration.type === 'continuous';

  let statusText = '';
  if (isDismissed) {
    statusText = 'Dosage deleted for today';
  } else if (course.isCourseExpired) {
    statusText = 'Course completed';
  } else if (cyclePhase && !cyclePhase.inActivePhase) {
    statusText = `In scheduled rest break (${cyclePhase.daysUntilNextPhase}d until resumption)`;
  } else if (!isScheduled) {
    if (nextDose) {
      const dayName = getDayName(nextDose.getDay() as DayOfWeek);
      statusText = `Next due on ${dayName}`;
    } else {
      statusText = 'No upcoming dose scheduled';
    }
  } else if (isFullyTaken) {
    statusText = `All ${supp.doseAmount.toLocaleString()} ${supp.unit} taken today`;
  } else if (totalTaken > 0) {
    statusText = `${remainingDoseToday.toLocaleString()} ${supp.unit} left to take today (${totalTaken.toLocaleString()} taken)`;
  } else {
    statusText = `${supp.doseAmount.toLocaleString()} ${supp.unit} left to take today`;
  }

  return {
    supplement: supp,
    isScheduledToday: isScheduled,
    isDismissedToday: isDismissed,
    isCourseActive: course.isCourseActive,
    isCourseExpired: course.isCourseExpired,
    isInfinity,
    cyclePhase,
    daysRemainingInCourse: course.daysRemaining === Infinity ? undefined : course.daysRemaining,
    totalCourseDays: course.totalDays === Infinity ? undefined : course.totalDays,
    courseElapsedDays: course.elapsedDays,
    coursePercent: course.percentComplete,
    totalScheduledDose: totalScheduled,
    totalTakenDose: totalTaken,
    remainingDoseToday,
    isFullyTaken,
    nextScheduledDateTime: nextDose || new Date(),
    statusText,
    isLowStock,
    isOutOfStock,
    remainingStock: trackStock ? currentStock : undefined,
    stockUnit: supp.inventory?.unit || supp.form || 'doses',
    nextDoseCountdownText,
    expiryStatus,
  };
}
