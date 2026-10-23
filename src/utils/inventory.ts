import { Supplement, TimingSlot } from '../types/supplement';
import { formatDateToYYYYMMDD, parseYYYYMMDD } from './dates';

export interface TimingSlotMeta {
  id: TimingSlot;
  label: string;
  shortLabel: string;
  description: string;
  timeRange: string;
  icon: 'sun' | 'zap' | 'utensils' | 'dumbbell' | 'moon' | 'clock';
  colorTag: string;
  borderClass: string;
  badgeBg: string;
  badgeText: string;
}

export const TIMING_SLOT_METAS: Record<TimingSlot, TimingSlotMeta> = {
  morning_empty_stomach: {
    id: 'morning_empty_stomach',
    label: 'Morning / Empty Stomach',
    shortLabel: 'Morning Fasted',
    description: 'Optimal for thyroid, iron, L-tyrosine, electrolytes, and water-soluble energy cofactors',
    timeRange: '06:00 – 10:00',
    icon: 'sun',
    colorTag: 'amber',
    borderClass: 'border-amber-200 dark:border-amber-800/80',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/70',
    badgeText: 'text-amber-900 dark:text-amber-200',
  },
  pre_workout: {
    id: 'pre_workout',
    label: 'Pre-Workout Activation',
    shortLabel: 'Pre-Workout',
    description: 'Citrulline, beta-alanine, cordyceps, and nitric oxide precursors 30m prior to exertion',
    timeRange: '30m Pre-Training',
    icon: 'zap',
    colorTag: 'orange',
    borderClass: 'border-orange-200 dark:border-orange-800/80',
    badgeBg: 'bg-orange-100 dark:bg-orange-950/70',
    badgeText: 'text-orange-900 dark:text-orange-200',
  },
  with_meals: {
    id: 'with_meals',
    label: 'With Meals (Fat-Soluble)',
    shortLabel: 'With Meals',
    description: 'Fat-soluble Vitamin D3, Omega-3s, CoQ10, K2, and curcumin requiring dietary lipid matrix',
    timeRange: 'Breakfast / Lunch',
    icon: 'utensils',
    colorTag: 'emerald',
    borderClass: 'border-emerald-200 dark:border-emerald-800/80',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70',
    badgeText: 'text-emerald-900 dark:text-emerald-200',
  },
  post_workout: {
    id: 'post_workout',
    label: 'Post-Workout Recovery',
    shortLabel: 'Post-Workout',
    description: 'Protein synthesis cofactors, creatine, glutamine, and anti-inflammatory recovery botanicals',
    timeRange: 'Within 45m Post-Exertion',
    icon: 'dumbbell',
    colorTag: 'sky',
    borderClass: 'border-sky-200 dark:border-sky-800/80',
    badgeBg: 'bg-sky-100 dark:bg-sky-950/70',
    badgeText: 'text-sky-900 dark:text-sky-200',
  },
  bedtime: {
    id: 'bedtime',
    label: 'Bedtime & Evening Rest',
    shortLabel: 'Bedtime',
    description: 'Magnesium glycinate, zinc, apigenin, L-theanine, and neuro-restorative sleep adaptogens',
    timeRange: '20:00 – 23:00',
    icon: 'moon',
    colorTag: 'indigo',
    borderClass: 'border-indigo-200 dark:border-indigo-800/80',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/70',
    badgeText: 'text-indigo-900 dark:text-indigo-200',
  },
  anytime: {
    id: 'anytime',
    label: 'Flexible / Any Time',
    shortLabel: 'Flexible',
    description: 'General support vitamins and minerals taken at any convenient time across the day',
    timeRange: 'Any Time Today',
    icon: 'clock',
    colorTag: 'stone',
    borderClass: 'border-stone-200 dark:border-stone-800',
    badgeBg: 'bg-stone-100 dark:bg-stone-800',
    badgeText: 'text-stone-700 dark:text-stone-300',
  },
};

export const ORDERED_TIMING_SLOTS: TimingSlot[] = [
  'morning_empty_stomach',
  'pre_workout',
  'with_meals',
  'post_workout',
  'bedtime',
  'anytime',
];

/**
 * Categorizes a supplement into its best-matching timing slot
 */
export function categorizeTimingSlot(supplement: Supplement): TimingSlot {
  if (supplement.timingSlot) {
    return supplement.timingSlot;
  }

  // 1. Check explicit foodTiming
  if (supplement.foodTiming === 'empty_stomach' || supplement.foodTiming === 'with_morning_meal') {
    return 'morning_empty_stomach';
  }
  if (supplement.foodTiming === 'with_food') {
    return 'with_meals';
  }
  if (supplement.foodTiming === 'before_bed') {
    return 'bedtime';
  }

  // 2. Keyword detection for common fat-soluble and bedtime items
  const nameLower = (supplement.name || '').toLowerCase();
  const notesLower = (supplement.notes || '').toLowerCase();

  if (
    nameLower.includes('vitamin d') ||
    nameLower.includes('d3') ||
    nameLower.includes('omega') ||
    nameLower.includes('fish oil') ||
    nameLower.includes('coq10') ||
    nameLower.includes('curcumin') ||
    nameLower.includes('turmeric') ||
    nameLower.includes('vitamin k') ||
    nameLower.includes('k2') ||
    nameLower.includes('vitamin e') ||
    nameLower.includes('astaxanthin')
  ) {
    return 'with_meals';
  }

  if (
    nameLower.includes('magnesium') ||
    nameLower.includes('theanine') ||
    nameLower.includes('melatonin') ||
    nameLower.includes('apigenin') ||
    nameLower.includes('gaba') ||
    nameLower.includes('chamomile') ||
    notesLower.includes('sleep') ||
    notesLower.includes('bedtime')
  ) {
    return 'bedtime';
  }

  if (
    nameLower.includes('creatine') ||
    nameLower.includes('protein') ||
    nameLower.includes('glutamine')
  ) {
    return 'post_workout';
  }

  if (
    nameLower.includes('citrulline') ||
    nameLower.includes('beta-alanine') ||
    nameLower.includes('caffeine') ||
    nameLower.includes('pre-workout')
  ) {
    return 'pre_workout';
  }

  // 3. Clock time fallback
  if (supplement.doseTime) {
    const hour = parseInt(supplement.doseTime.split(':')[0], 10);
    if (!isNaN(hour)) {
      if (hour < 11) return 'morning_empty_stomach';
      if (hour < 15) return 'with_meals';
      if (hour < 18) return 'pre_workout';
      if (hour < 21) return 'post_workout';
      return 'bedtime';
    }
  }

  return 'anytime';
}

/**
 * Resolves the physical count consumed per dose (e.g. 1 capsule, 2 tablets).
 * Distinguishes physical pills from chemical strength (mg, IU, mcg).
 */
export function getPhysicalServingsPerDose(supplement: Supplement): number {
  const unitLower = (supplement.unit || '').toLowerCase().trim();
  const physicalUnits = [
    'capsule', 'capsules',
    'tablet', 'tablets',
    'gummy', 'gummies',
    'pill', 'pills',
    'softgel', 'softgels',
    'drop', 'drops',
    'packet', 'packets',
    'scoop', 'scoops'
  ];
  
  if (physicalUnits.includes(unitLower)) {
    return Math.max(1, supplement.doseAmount || 1);
  }
  // When unit is chemical strength (e.g. IU, mg, mcg, g, ml), physical serving is 1 pill/capsule per take
  return 1;
}

/**
 * Calculates average daily consumption rate in doses/day
 */
export function getDailyIntakeRate(supplement: Supplement): number {
  let rate = 1;

  if (supplement.frequencyType === 'daily') {
    rate = 1;
  } else if (supplement.frequencyType === 'weekly') {
    const daysCount = supplement.selectedDays?.length || 1;
    rate = daysCount / 7;
  } else if (supplement.frequencyType === 'monthly') {
    rate = 1 / 30.4;
  } else if (supplement.frequencyType === 'interval') {
    const interval = Math.max(1, supplement.intervalDays || 1);
    rate = 1 / interval;
  }

  // Adjust for cyclic protocol (e.g. 14 on, 7 off -> 14/21)
  if (supplement.cycleConfig?.isCyclic) {
    const onDays = Math.max(1, supplement.cycleConfig.onDays || 14);
    const offDays = Math.max(0, supplement.cycleConfig.offDays || 7);
    rate *= onDays / (onDays + offDays);
  }

  return rate;
}

export interface StockCalculationResult {
  daysRemaining: number | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
  remainingServings: number | null;
  dailyIntakeRate: number;
  predictedRefillDate: string | null;
  refillDateFormatted: string | null;
}

/**
 * Dynamic 7-Day Low-Stock & Refill Predictor
 * Computes exact days of supply remaining based on consumption rate and physical servings.
 * Triggers warning badge when daysRemaining <= 7.
 */
export function calculateStockDaysRemaining(
  supplement: Supplement,
  referenceDate: Date = new Date()
): StockCalculationResult {
  const trackStock = supplement.inventory?.trackStock ?? false;
  if (!trackStock) {
    return {
      daysRemaining: null,
      isLowStock: false,
      isOutOfStock: false,
      remainingServings: null,
      dailyIntakeRate: 0,
      predictedRefillDate: null,
      refillDateFormatted: null,
    };
  }

  const currentStock = Math.max(0, supplement.inventory?.currentStock ?? 0);
  if (currentStock <= 0) {
    return {
      daysRemaining: 0,
      isLowStock: true,
      isOutOfStock: true,
      remainingServings: 0,
      dailyIntakeRate: 0,
      predictedRefillDate: formatDateToYYYYMMDD(referenceDate),
      refillDateFormatted: 'Immediately (Out of Stock)',
    };
  }

  const pillsPerTake = getPhysicalServingsPerDose(supplement);
  const remainingServings = Math.floor(currentStock / pillsPerTake);

  let weeklyConsumption = 0;
  if (supplement.frequencyType === 'daily') {
    weeklyConsumption = pillsPerTake * 7;
    if (supplement.cycleConfig?.isCyclic) {
      const onDays = Math.max(1, supplement.cycleConfig.onDays || 14);
      const offDays = Math.max(0, supplement.cycleConfig.offDays || 7);
      const activeRatio = onDays / (onDays + offDays);
      weeklyConsumption *= activeRatio;
    }
  } else if (supplement.frequencyType === 'weekly') {
    const daysCount = (supplement.selectedDays && supplement.selectedDays.length > 0)
      ? supplement.selectedDays.length
      : 1;
    weeklyConsumption = pillsPerTake * daysCount;
  } else if (supplement.frequencyType === 'interval') {
    const interval = Math.max(1, supplement.intervalDays || 1);
    weeklyConsumption = (pillsPerTake * 7) / interval;
  } else if (supplement.frequencyType === 'monthly') {
    weeklyConsumption = (pillsPerTake * 7) / 30.4;
  } else {
    weeklyConsumption = pillsPerTake * 7;
  }

  const pillsPerDay = weeklyConsumption / 7;
  const daysRemaining = pillsPerDay > 0 ? Math.floor(currentStock / pillsPerDay) : null;

  let predictedRefillDate: string | null = null;
  let refillDateFormatted: string | null = null;

  if (daysRemaining !== null && daysRemaining !== Infinity) {
    const depletionDate = new Date(referenceDate);
    depletionDate.setDate(depletionDate.getDate() + daysRemaining);
    predictedRefillDate = formatDateToYYYYMMDD(depletionDate);
    refillDateFormatted = depletionDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: depletionDate.getFullYear() !== referenceDate.getFullYear() ? 'numeric' : undefined,
    });
  }

  // Dynamic 7-day low-stock threshold per confirmed user decision
  const isLowStock = daysRemaining !== null && daysRemaining <= 7;

  return {
    daysRemaining,
    isLowStock,
    isOutOfStock: false,
    remainingServings,
    dailyIntakeRate: pillsPerDay,
    predictedRefillDate,
    refillDateFormatted,
  };
}

/**
 * Value & Cost Analysis Helper
 */
export interface ValueMetrics {
  costPerBottle: number;
  bottleSize: number;
  totalServingsInBottle: number;
  costPerServing: number;
  costPerDay: number;
  monthlyInvestment: number;
  annualInvestment: number;
  hasPriceData: boolean;
}

export function calculateValueMetrics(supplement: Supplement): ValueMetrics {
  const costPerBottle = supplement.costPerBottle || 0;
  const bottleSize = supplement.inventory?.bottleSize || 60;
  const pillsPerTake = getPhysicalServingsPerDose(supplement);
  const totalServings = Math.max(1, Math.floor(bottleSize / pillsPerTake));

  const costPerServing = costPerBottle > 0 ? costPerBottle / totalServings : 0;
  const dailyRate = getDailyIntakeRate(supplement);
  const costPerDay = costPerServing * dailyRate;
  const monthlyInvestment = costPerDay * 30.44;
  const annualInvestment = costPerDay * 365.25;

  return {
    costPerBottle,
    bottleSize,
    totalServingsInBottle: totalServings,
    costPerServing,
    costPerDay,
    monthlyInvestment,
    annualInvestment,
    hasPriceData: costPerBottle > 0,
  };
}

/**
 * Immutable stock decrement on dose completion (subtracts 1 physical serving, not chemical strength)
 */
export function deductStockOnDose(
  supplement: Supplement,
  amountToDeduct?: number
): Supplement {
  if (!supplement.inventory?.trackStock) {
    return supplement;
  }

  const physicalPerDose = getPhysicalServingsPerDose(supplement);
  const deduct = (amountToDeduct !== undefined && amountToDeduct > 0 && amountToDeduct <= physicalPerDose * 5)
    ? amountToDeduct
    : physicalPerDose;

  const current = supplement.inventory.currentStock ?? 0;
  const newStock = Math.max(0, current - deduct);

  return {
    ...supplement,
    inventory: {
      ...supplement.inventory,
      currentStock: newStock,
    },
  };
}

/**
 * Immutable stock restore on dose undo (restores 1 physical serving, not chemical strength)
 */
export function restoreStockOnUndo(
  supplement: Supplement,
  amountToRestore?: number
): Supplement {
  if (!supplement.inventory?.trackStock) {
    return supplement;
  }

  const physicalPerDose = getPhysicalServingsPerDose(supplement);
  const restore = (amountToRestore !== undefined && amountToRestore > 0 && amountToRestore <= physicalPerDose * 5)
    ? amountToRestore
    : physicalPerDose;

  const current = supplement.inventory.currentStock ?? 0;
  const bottleSize = supplement.inventory.bottleSize || 9999;
  const newStock = Math.min(bottleSize, current + restore);

  return {
    ...supplement,
    inventory: {
      ...supplement.inventory,
      currentStock: newStock,
    },
  };
}
