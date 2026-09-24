import { Supplement, DoseLog, UserProfile } from '../types/supplement';
import { formatDateToYYYYMMDD, calculateEndDate } from './dates';

const STORAGE_PROFILES_KEY = 'suppletrack_profiles_v1';
const STORAGE_ACTIVE_PROFILE_KEY = 'suppletrack_active_profile_v1';
const STORAGE_SUPPLEMENTS_KEY = 'suppletrack_supplements_v1';
const STORAGE_LOGS_KEY = 'suppletrack_logs_v1';
const STORAGE_NOTIFICATION_KEY = 'suppletrack_notifications_v1';

export function getInitialProfiles(): UserProfile[] {
  return [
    {
      id: 'profile_me',
      name: 'Neelam (Me)',
      relationship: 'Self',
      type: 'adult',
      avatarIcon: 'user',
      themeColor: 'emerald',
      notes: 'Primary personal regimen, energy, cellular health & vitality',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'profile_dad',
      name: 'Dad',
      relationship: 'Dad',
      type: 'senior',
      avatarIcon: 'glasses',
      themeColor: 'sky',
      notes: 'Senior cardiovascular vitality, joint flexibility & blood pressure wellness',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function loadProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (!raw) {
      const initial = getInitialProfiles();
      saveProfiles(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return getInitialProfiles();
  } catch (e) {
    console.error('Error loading profiles from storage', e);
    return getInitialProfiles();
  }
}

export function saveProfiles(profiles: UserProfile[]) {
  try {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Error saving profiles to storage', e);
  }
}

export function loadActiveProfileId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY);
    if (saved) return saved;
  } catch (e) {}
  return 'profile_me';
}

export function saveActiveProfileId(id: string) {
  try {
    localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, id);
  } catch (e) {}
}

export function getInitialSupplements(): Supplement[] {
  const today = new Date();
  const todayStr = formatDateToYYYYMMDD(today);
  
  // 1 month ago start for B12 so it shows authentic progress in its 3-month course
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const b12StartStr = formatDateToYYYYMMDD(oneMonthAgo);
  const b12EndStr = calculateEndDate(b12StartStr, 3, 'months');

  // Vitamin D course starting 2 weeks ago for 8 weeks
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const dStartStr = formatDateToYYYYMMDD(twoWeeksAgo);
  const dEndStr = calculateEndDate(dStartStr, 8, 'weeks');

  return [
    // --- Neelam's Regimen ---
    {
      id: 'supp-vit-d-60k',
      profileId: 'profile_me',
      name: 'Vitamin D3 (Cholecalciferol)',
      doseAmount: 60000,
      unit: 'IU',
      form: 'capsule',
      category: 'vitamins',
      colorTag: 'amber',
      frequencyType: 'weekly',
      selectedDays: [1], // Monday
      doseTime: '09:00',
      foodTiming: 'with_food',
      duration: {
        type: 'infinity', // For Life (Infinity) - never stops after 3 months
        startDate: dStartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 3, // LOW STOCK to demonstrate alert!
        bottleSize: 12,
        unit: 'capsules',
        lowStockThreshold: 4,
        lastRestockedDate: dStartStr,
      },
      notes: 'High-dose weekly booster taken for life (Infinity protocol) for optimal cellular and hormonal health.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-boron-cyclic',
      profileId: 'profile_me',
      name: 'Boron (Glycinate Complex)',
      doseAmount: 6,
      unit: 'mg',
      form: 'capsule',
      category: 'minerals',
      colorTag: 'indigo',
      frequencyType: 'daily',
      doseTime: '09:30',
      foodTiming: 'with_food',
      cycleConfig: {
        isCyclic: true,
        onDays: 14, // 2 weeks ON
        offDays: 7, // 1 week OFF
        cycleStartDate: b12StartStr,
      },
      duration: {
        type: 'infinity',
        startDate: b12StartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 28,
        bottleSize: 60,
        unit: 'capsules',
        lowStockThreshold: 10,
        lastRestockedDate: b12StartStr,
      },
      notes: 'Special Cyclic Protocol: Take daily for 2 weeks (14 days), take a 1-week break (7 days), and repeat indefinitely for free testosterone & bone mineral balance.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-vit-b12-1500',
      profileId: 'profile_me',
      name: 'Vitamin B12 (Methylcobalamin)',
      doseAmount: 1500,
      unit: 'mg',
      form: 'tablet',
      category: 'vitamins',
      colorTag: 'rose',
      frequencyType: 'weekly',
      selectedDays: [1], // Monday
      doseTime: '10:00',
      foodTiming: 'with_morning_meal',
      duration: {
        type: 'fixed',
        startDate: b12StartStr,
        endDate: b12EndStr,
        periodValue: 3,
        periodUnit: 'months',
      },
      inventory: {
        trackStock: true,
        currentStock: 12,
        bottleSize: 30,
        unit: 'tablets',
        lowStockThreshold: 5,
        lastRestockedDate: b12StartStr,
      },
      notes: 'Weekly high-dose booster to restore optimal neurological & cellular energy levels.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-magnesium-glycinate',
      profileId: 'profile_me',
      name: 'Magnesium Glycinate',
      doseAmount: 400,
      unit: 'mg',
      form: 'capsule',
      category: 'minerals',
      colorTag: 'indigo',
      frequencyType: 'daily',
      doseTime: '21:30',
      foodTiming: 'before_bed',
      duration: {
        type: 'continuous',
        startDate: b12StartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 46,
        bottleSize: 60,
        unit: 'capsules',
        lowStockThreshold: 10,
        lastRestockedDate: b12StartStr,
      },
      notes: 'Deep relaxation and muscle recovery support.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-omega-3',
      profileId: 'profile_me',
      name: 'Omega-3 Fish Oil (EPA / DHA)',
      doseAmount: 1000,
      unit: 'mg',
      form: 'softgel',
      category: 'omega',
      colorTag: 'sky',
      frequencyType: 'daily',
      doseTime: '13:00',
      foodTiming: 'with_food',
      duration: {
        type: 'continuous',
        startDate: b12StartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 82,
        bottleSize: 120,
        unit: 'softgels',
        lowStockThreshold: 14,
        lastRestockedDate: b12StartStr,
      },
      notes: 'Cardiovascular and cellular support.',
      createdAt: new Date().toISOString(),
    },

    // --- Dad's Regimen ---
    {
      id: 'supp-dad-coq10',
      profileId: 'profile_dad',
      name: 'CoQ10 Ubiquinol (Active Antioxidant)',
      doseAmount: 200,
      unit: 'mg',
      form: 'softgel',
      category: 'general',
      colorTag: 'rose',
      frequencyType: 'daily',
      doseTime: '13:00',
      foodTiming: 'with_food',
      duration: {
        type: 'infinity',
        startDate: b12StartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 35,
        bottleSize: 60,
        unit: 'softgels',
        lowStockThreshold: 10,
        lastRestockedDate: b12StartStr,
      },
      notes: "Dad's cardiovascular cellular energy and heart muscle vitality, taken with lunch.",
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-dad-glucosamine',
      profileId: 'profile_dad',
      name: 'Glucosamine & Chondroitin Complex',
      doseAmount: 1500,
      unit: 'mg',
      form: 'tablet',
      category: 'minerals',
      colorTag: 'emerald',
      frequencyType: 'daily',
      doseTime: '08:30',
      foodTiming: 'with_morning_meal',
      duration: {
        type: 'infinity',
        startDate: b12StartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 52,
        bottleSize: 90,
        unit: 'tablets',
        lowStockThreshold: 14,
        lastRestockedDate: b12StartStr,
      },
      notes: "Dad's joint flexibility, knee cartilage cushion & walking comfort.",
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-dad-omega',
      profileId: 'profile_dad',
      name: 'Triple Strength Omega-3 EPA/DHA',
      doseAmount: 1200,
      unit: 'mg',
      form: 'softgel',
      category: 'omega',
      colorTag: 'sky',
      frequencyType: 'daily',
      doseTime: '13:00',
      foodTiming: 'with_food',
      duration: {
        type: 'continuous',
        startDate: b12StartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 40,
        bottleSize: 60,
        unit: 'softgels',
        lowStockThreshold: 10,
        lastRestockedDate: b12StartStr,
      },
      notes: "Dad's arterial elasticity, triglyceride balance, and cognitive clarity.",
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-dad-multivitamin',
      profileId: 'profile_dad',
      name: "Senior Men's 50+ Multivitamin & Zinc",
      doseAmount: 1,
      unit: 'tablets',
      form: 'tablet',
      category: 'vitamins',
      colorTag: 'amber',
      frequencyType: 'daily',
      doseTime: '08:30',
      foodTiming: 'with_morning_meal',
      duration: {
        type: 'continuous',
        startDate: b12StartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 25,
        bottleSize: 60,
        unit: 'tablets',
        lowStockThreshold: 10,
        lastRestockedDate: b12StartStr,
      },
      notes: "Dad's comprehensive daily micronutrient booster with active B-complex, zinc, and saw palmetto.",
      createdAt: new Date().toISOString(),
    },
  ];
}

export function getInitialLogs(): DoseLog[] {
  const logs: DoseLog[] = [];
  const today = new Date();

  // Generate realistic past logs for the last 60 days
  for (let i = 60; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateToYYYYMMDD(d);
    const dayOfWeek = d.getDay();
    const dayOfMonth = d.getDate();

    // Daily magnesium taken most evenings (88% adherence)
    if (Math.random() > 0.12) {
      logs.push({
        id: `log-mag-${dateStr}`,
        supplementId: 'supp-magnesium-glycinate',
        supplementName: 'Magnesium Glycinate',
        amountTaken: 400,
        unit: 'mg',
        timestamp: `${dateStr}T21:35:00.000Z`,
        date: dateStr,
        time: '21:35',
        notes: 'Taken 30 min before bed with water',
      });
    }

    // Daily Omega-3 taken most days (82% adherence)
    if (Math.random() > 0.18) {
      logs.push({
        id: `log-omg-${dateStr}`,
        supplementId: 'supp-omega-3',
        supplementName: 'Omega-3 Fish Oil (EPA / DHA)',
        amountTaken: 1000,
        unit: 'mg',
        timestamp: `${dateStr}T13:15:00.000Z`,
        date: dateStr,
        time: '13:15',
        notes: 'Taken with lunch',
      });
    }

    // Weekly Vitamin D (on Mondays, dayOfWeek === 1, within last 8 weeks)
    if (dayOfWeek === 1 && i <= 56) {
      logs.push({
        id: `log-vitd-${dateStr}`,
        supplementId: 'supp-vit-d-60k',
        supplementName: 'Vitamin D3 (Cholecalciferol)',
        amountTaken: 60000,
        unit: 'IU',
        timestamp: `${dateStr}T09:10:00.000Z`,
        date: dateStr,
        time: '09:10',
        notes: 'Taken with breakfast',
      });
    }

    // Weekly Vitamin B12 (on Mondays, dayOfWeek === 1)
    if (dayOfWeek === 1) {
      logs.push({
        id: `log-b12-${dateStr}`,
        supplementId: 'supp-vit-b12-1500',
        supplementName: 'Vitamin B12 (Methylcobalamin)',
        amountTaken: 1500,
        unit: 'mg',
        timestamp: `${dateStr}T09:35:00.000Z`,
        date: dateStr,
        time: '09:35',
        notes: 'Weekly Monday dose',
      });
    }

    // Monthly B-complex booster on the 1st
    if (dayOfMonth === 1) {
      logs.push({
        id: `log-bcomp-${dateStr}`,
        supplementId: 'supp-monthly-b-complex',
        supplementName: 'Monthly B-Complex Booster',
        amountTaken: 1,
        unit: 'tablets',
        timestamp: `${dateStr}T10:05:00.000Z`,
        date: dateStr,
        time: '10:05',
        notes: 'Monthly renewal booster',
      });
    }
  }

  return logs;
}

export function loadSupplements(): Supplement[] {
  try {
    const raw = localStorage.getItem(STORAGE_SUPPLEMENTS_KEY);
    if (!raw) {
      const initial = getInitialSupplements();
      saveSupplements(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((s: Supplement) => ({
        ...s,
        profileId: s.profileId || 'profile_me',
      }));
    }
    return getInitialSupplements();
  } catch (e) {
    console.error('Error loading supplements from storage', e);
    return getInitialSupplements();
  }
}

export function saveSupplements(supplements: Supplement[]) {
  try {
    localStorage.setItem(STORAGE_SUPPLEMENTS_KEY, JSON.stringify(supplements));
  } catch (e) {
    console.error('Error saving supplements to storage', e);
  }
}

export function loadDoseLogs(): DoseLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_LOGS_KEY);
    if (!raw) {
      const initial = getInitialLogs();
      saveDoseLogs(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((l: DoseLog) => ({
        ...l,
        profileId: l.profileId || 'profile_me',
      }));
    }
    return getInitialLogs();
  } catch (e) {
    console.error('Error loading dose logs from storage', e);
    return getInitialLogs();
  }
}

export function saveDoseLogs(logs: DoseLog[]) {
  try {
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving dose logs to storage', e);
  }
}

export function exportBackupData(): string {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    profiles: loadProfiles(),
    activeProfileId: loadActiveProfileId(),
    supplements: loadSupplements(),
    logs: loadDoseLogs(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.supplements || !Array.isArray(parsed.supplements)) {
      return { success: false, message: 'Invalid data format: missing supplements array.' };
    }
    if (parsed.profiles && Array.isArray(parsed.profiles)) {
      saveProfiles(parsed.profiles);
    }
    if (parsed.activeProfileId) {
      saveActiveProfileId(parsed.activeProfileId);
    }
    saveSupplements(parsed.supplements);
    if (parsed.logs && Array.isArray(parsed.logs)) {
      saveDoseLogs(parsed.logs);
    }
    return { success: true, message: 'Data imported successfully!' };
  } catch (e) {
    return { success: false, message: `Failed to parse backup JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export function resetToDemoData() {
  const profiles = getInitialProfiles();
  const supps = getInitialSupplements();
  const logs = getInitialLogs();
  saveProfiles(profiles);
  saveActiveProfileId('profile_me');
  saveSupplements(supps);
  saveDoseLogs(logs);
  return { profiles, supps, logs };
}
