import { Supplement, DoseLog } from '../types/supplement';
import { UserProfile, INITIAL_PROFILES } from '../types/profile';
import { formatDateToYYYYMMDD, calculateEndDate } from './dates';

const STORAGE_SUPPLEMENTS_KEY = 'suppletrack_supplements_v1';
const STORAGE_LOGS_KEY = 'suppletrack_logs_v1';
const STORAGE_PROFILES_KEY = 'suppletrack_profiles_v1';
const STORAGE_ACTIVE_PROFILE_KEY = 'suppletrack_active_profile_v1';

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

  return [
    // --- MYSELF (Primary User) ---
    {
      id: 'supp-vit-d-60k',
      profileId: 'profile_self',
      name: 'Vitamin D3 (Cholecalciferol)',
      doseAmount: 60000,
      unit: 'IU',
      form: 'capsule',
      category: 'vitamins',
      colorTag: 'amber',
      frequencyType: 'weekly',
      selectedDays: [1], // Monday
      doseTime: '08:30',
      foodTiming: 'with_food',
      syncToGoogleCalendar: true,
      duration: {
        type: 'infinity',
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
      notes: 'High-dose weekly booster taken for life for optimal cellular and hormonal health.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-boron-cyclic',
      profileId: 'profile_self',
      name: 'Boron (Glycinate Complex)',
      doseAmount: 6,
      unit: 'mg',
      form: 'capsule',
      category: 'minerals',
      colorTag: 'indigo',
      frequencyType: 'daily',
      cycleConfig: {
        isCyclic: true,
        onDays: 14,
        offDays: 7,
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
      notes: 'Special Cyclic Protocol: Take daily for 2 weeks, pause 1 week, repeat.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-vit-b12-1500',
      profileId: 'profile_self',
      name: 'Vitamin B12 (Methylcobalamin)',
      doseAmount: 1500,
      unit: 'mg',
      form: 'tablet',
      category: 'vitamins',
      colorTag: 'rose',
      frequencyType: 'weekly',
      selectedDays: [1], // Monday
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
      notes: 'Weekly high-dose booster for neurological & cellular energy levels.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-magnesium-glycinate',
      profileId: 'profile_self',
      name: 'Magnesium Glycinate',
      doseAmount: 400,
      unit: 'mg',
      form: 'capsule',
      category: 'minerals',
      colorTag: 'indigo',
      frequencyType: 'daily',
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
      notes: 'Deep relaxation and muscle recovery support before bed.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-omega-3',
      profileId: 'profile_self',
      name: 'Omega-3 Fish Oil (EPA / DHA)',
      doseAmount: 1000,
      unit: 'mg',
      form: 'softgel',
      category: 'omega',
      colorTag: 'sky',
      frequencyType: 'daily',
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
      notes: 'Cardiovascular and cellular support taken with lunch.',
      createdAt: new Date().toISOString(),
    },

    // --- DAD'S PROFILE ---
    {
      id: 'supp-dad-coq10',
      profileId: 'profile_dad',
      name: 'CoQ10 (Ubiquinol 100mg)',
      doseAmount: 100,
      unit: 'mg',
      form: 'softgel',
      category: 'omega',
      colorTag: 'rose',
      frequencyType: 'daily',
      duration: {
        type: 'continuous',
        startDate: dStartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 42,
        bottleSize: 60,
        unit: 'softgels',
        lowStockThreshold: 10,
        lastRestockedDate: dStartStr,
      },
      notes: 'For Dad: Heart energy and cellular mitochondrial vitality. Take in morning after breakfast with glass of water.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-dad-senior-multi',
      profileId: 'profile_dad',
      name: 'Senior 50+ Complete Multivitamin',
      doseAmount: 1,
      unit: 'tablets',
      form: 'tablet',
      category: 'vitamins',
      colorTag: 'emerald',
      frequencyType: 'daily',
      duration: {
        type: 'continuous',
        startDate: dStartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 25,
        bottleSize: 90,
        unit: 'tablets',
        lowStockThreshold: 14,
        lastRestockedDate: dStartStr,
      },
      notes: 'For Dad: Balanced micronutrients for longevity, eye health (Lutein), and immunity.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-dad-calcium-d3',
      profileId: 'profile_dad',
      name: 'Calcium Citrate + Vitamin D3',
      doseAmount: 500,
      unit: 'mg',
      form: 'tablet',
      category: 'minerals',
      colorTag: 'sky',
      frequencyType: 'daily',
      duration: {
        type: 'continuous',
        startDate: dStartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 18,
        bottleSize: 60,
        unit: 'tablets',
        lowStockThreshold: 8,
        lastRestockedDate: dStartStr,
      },
      notes: 'For Dad: Joint and bone density preservation. Take with lunch.',
      createdAt: new Date().toISOString(),
    },

    // --- KIDS PROFILE ---
    {
      id: 'supp-kids-multi-gummy',
      profileId: 'profile_kids',
      name: 'Kids Gummy Multivitamin',
      doseAmount: 2,
      unit: 'capsules', // Represented as chewable gummies
      form: 'gummy',
      category: 'vitamins',
      colorTag: 'amber',
      frequencyType: 'daily',
      duration: {
        type: 'continuous',
        startDate: dStartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 34,
        bottleSize: 60,
        unit: 'gummies',
        lowStockThreshold: 10,
        lastRestockedDate: dStartStr,
      },
      notes: 'Kids chewable vitamin bears with Vit C, D & Zinc. Fun and tasty with breakfast!',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'supp-kids-omega3-dha',
      profileId: 'profile_kids',
      name: 'Kids Smart DHA Omega-3 Gummy',
      doseAmount: 1,
      unit: 'capsules',
      form: 'gummy',
      category: 'omega',
      colorTag: 'violet',
      frequencyType: 'daily',
      duration: {
        type: 'continuous',
        startDate: dStartStr,
      },
      inventory: {
        trackStock: true,
        currentStock: 28,
        bottleSize: 45,
        unit: 'gummies',
        lowStockThreshold: 7,
        lastRestockedDate: dStartStr,
      },
      notes: 'Brain and eye development DHA gummies. Citrus burst flavor.',
      createdAt: new Date().toISOString(),
    }
  ];
}

export function getInitialLogs(): DoseLog[] {
  const logs: DoseLog[] = [];
  const today = new Date();

  // Past logs for the last 60 days
  for (let i = 60; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDateToYYYYMMDD(d);
    const dayOfWeek = d.getDay();

    // Myself: Magnesium
    if (Math.random() > 0.12) {
      logs.push({
        id: `log-mag-${dateStr}`,
        profileId: 'profile_self',
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

    // Myself: Omega-3
    if (Math.random() > 0.18) {
      logs.push({
        id: `log-omg-${dateStr}`,
        profileId: 'profile_self',
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

    // Dad: CoQ10
    if (Math.random() > 0.15) {
      logs.push({
        id: `log-dad-coq10-${dateStr}`,
        profileId: 'profile_dad',
        supplementId: 'supp-dad-coq10',
        supplementName: 'CoQ10 (Ubiquinol 100mg)',
        amountTaken: 100,
        unit: 'mg',
        timestamp: `${dateStr}T08:30:00.000Z`,
        date: dateStr,
        time: '08:30',
        notes: 'Dad took with morning oatmeal',
      });
    }

    // Kids: Gummy Multi
    if (Math.random() > 0.10) {
      logs.push({
        id: `log-kid-multi-${dateStr}`,
        profileId: 'profile_kids',
        supplementId: 'supp-kids-multi-gummy',
        supplementName: 'Kids Gummy Multivitamin',
        amountTaken: 2,
        unit: 'capsules',
        timestamp: `${dateStr}T08:15:00.000Z`,
        date: dateStr,
        time: '08:15',
        notes: 'Earned morning star sticker! ⭐',
      });
    }
  }

  return logs;
}

export function loadProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (!raw) {
      saveProfiles(INITIAL_PROFILES);
      return INITIAL_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_PROFILES;
  } catch (e) {
    console.error('Error loading profiles from storage', e);
    return INITIAL_PROFILES;
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
    return localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY) || 'profile_self';
  } catch {
    return 'profile_self';
  }
}

export function saveActiveProfileId(id: string) {
  try {
    localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, id);
  } catch (e) {
    console.error('Error saving active profile ID', e);
  }
}

export function loadSupplements(): Supplement[] {
  try {
    const raw = localStorage.getItem(STORAGE_SUPPLEMENTS_KEY);
    if (!raw) {
      const initial = getInitialSupplements();
      saveSupplements(initial);
      return initial;
    }
    const list: Supplement[] = JSON.parse(raw);
    // Guarantee backwards-compatibility with older items lacking profileId
    return list.map(item => ({
      ...item,
      profileId: item.profileId || 'profile_self',
    }));
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
    const list: DoseLog[] = JSON.parse(raw);
    return list.map(log => ({
      ...log,
      profileId: log.profileId || 'profile_self',
    }));
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
  const supps = getInitialSupplements();
  const logs = getInitialLogs();
  const profiles = INITIAL_PROFILES;
  saveProfiles(profiles);
  saveActiveProfileId('profile_self');
  saveSupplements(supps);
  saveDoseLogs(logs);
  return { supps, logs, profiles };
}
