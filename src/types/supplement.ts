export type DoseUnit = 'IU' | 'mg' | 'mcg' | 'g' | 'ml' | 'drops' | 'capsules' | 'tablets';

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'interval';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ... 6 = Saturday

export type FoodTiming = 'anytime' | 'with_food' | 'empty_stomach' | 'before_bed' | 'with_morning_meal';

export interface DurationConfig {
  type: 'continuous' | 'fixed' | 'infinity';
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  periodValue?: number; // e.g. 3
  periodUnit?: 'days' | 'weeks' | 'months';
}

export interface CycleConfig {
  isCyclic: boolean;
  onDays: number; // e.g. 14 for 2 weeks on
  offDays: number; // e.g. 7 for 1 week off
  cycleStartDate: string; // YYYY-MM-DD
  patternDescription?: string; // e.g. "Take daily for 2 weeks, then pause for 1 week (cycles indefinitely)"
}

export interface InventoryConfig {
  trackStock: boolean;
  currentStock: number; // e.g. 24 capsules or doses remaining
  bottleSize: number; // e.g. 60
  unit: string; // e.g. 'capsules', 'tablets', 'softgels', 'doses', 'ml'
  lowStockThreshold: number; // e.g. 7 doses or 10 units
  lastRestockedDate?: string;
}

export interface ExpiryStatusInfo {
  hasExpiry: boolean;
  expiryDate?: string; // YYYY-MM-DD
  isExpired: boolean;
  isNearingExpiry: boolean; // within 30 days
  daysUntilExpiry: number;
  formattedText: string;
  badgeVariant: 'expired' | 'warning' | 'caution' | 'good' | 'none';
}

export interface Supplement {
  id: string;
  profileId?: string; // Links to UserProfile.id ('profile_self', 'profile_dad', 'profile_kids', etc.)
  name: string;
  doseAmount: number; // e.g. 60000, 1500
  unit: DoseUnit; // e.g. 'IU', 'mg'
  form: 'softgel' | 'capsule' | 'tablet' | 'liquid' | 'powder' | 'gummy';
  category: 'vitamins' | 'minerals' | 'herbs' | 'amino_acids' | 'omega' | 'general';
  colorTag: string; // Tailwind color accent, e.g. 'emerald', 'amber', 'sky', 'rose', 'violet'
  
  // Scheduling
  frequencyType: FrequencyType;
  selectedDays?: DayOfWeek[]; // For 'weekly', e.g. [1] for Monday
  monthlyDayOfMonth?: number; // For 'monthly', 1 - 31 (e.g. 1st of month)
  intervalDays?: number; // For 'interval', e.g. every 2 days
  doseTime?: string; // Optional timing string
  foodTiming?: FoodTiming; // Optional
  
  // Special Cyclic Protocols (e.g. Boron 2 weeks on, 1 week off)
  cycleConfig?: CycleConfig;

  // Inventory tracking & low stock alerts
  inventory?: InventoryConfig;

  // Expiry date tracking (YYYY-MM-DD)
  expiryDate?: string;

  // Google Calendar Integration
  syncToGoogleCalendar?: boolean;
  googleCalendarEventId?: string;
  lastCalendarSyncAt?: string;

  // Course / Timer
  duration: DurationConfig;
  
  notes?: string;
  createdAt: string;
  archived?: boolean;
}

export interface DoseLog {
  id: string;
  profileId?: string; // Associated UserProfile
  supplementId: string;
  supplementName: string;
  amountTaken: number;
  unit: DoseUnit;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
}

export interface CyclePhaseInfo {
  inActivePhase: boolean;
  phaseDay: number;
  totalPhaseDays: number;
  daysUntilNextPhase: number;
  phaseLabel: string;
}

export interface TodaySupplementStatus {
  supplement: Supplement;
  isScheduledToday: boolean;
  isDismissedToday?: boolean;
  isCourseActive: boolean;
  isCourseExpired: boolean;
  isInfinity?: boolean;
  cyclePhase?: CyclePhaseInfo | null;
  daysRemainingInCourse?: number;
  totalCourseDays?: number;
  courseElapsedDays?: number;
  coursePercent: number;
  totalScheduledDose: number;
  totalTakenDose: number;
  remainingDoseToday: number;
  isFullyTaken: boolean;
  nextScheduledDateTime: Date;
  statusText: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
  remainingStock?: number;
  stockUnit?: string;
  nextDoseCountdownText: string;
  expiryStatus?: ExpiryStatusInfo;
}

export interface CloudRegimenData {
  version: number;
  appName: string;
  updatedAt: string;
  userEmail?: string;
  supplements: Supplement[];
  logs: DoseLog[];
  dismissedDoses: Record<string, string[]>;
}


