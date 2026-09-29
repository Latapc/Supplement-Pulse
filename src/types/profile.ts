export type ProfileType = 'adult' | 'assisted' | 'kid';

export interface UserProfile {
  id: string;
  name: string;
  type: ProfileType;
  relation: string; // e.g., "Myself (Account Owner)", "Dad", "Kids Profile"
  avatar: string; // Avatar identifier or emoji
  themeGradient: string; // Tailwind gradient classes
  accentColor: string; // Primary hex/color tag
  isPrimary?: boolean;
  pinCode?: string; // Optional PIN for parental control / kid lock
  notes?: string;
  dailyWaterGoalMl?: number;
  ageOrBirthYear?: string;
}

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'profile_self',
    name: 'Myself',
    type: 'adult',
    relation: 'Account Owner (Primary)',
    avatar: 'user',
    themeGradient: 'from-emerald-500 to-teal-700',
    accentColor: '#10b981',
    isPrimary: true,
    notes: 'Primary personal regimen: Vitamin D3 booster, Cyclic Boron, B12, Magnesium & Omega-3.',
  },
  {
    id: 'profile_dad',
    name: 'Dad',
    type: 'assisted',
    relation: 'Senior / Assisted Care',
    avatar: 'heart',
    themeGradient: 'from-blue-600 to-indigo-800',
    accentColor: '#3b82f6',
    isPrimary: false,
    notes: 'Dad\'s daily wellness: CoQ10 100mg for cardiovascular cellular energy, Senior 50+ Multi, Calcium + D3 with breakfast.',
  },
  {
    id: 'profile_kids',
    name: 'Junior (Kids)',
    type: 'kid',
    relation: 'Kids Supervised Profile',
    avatar: 'sparkles',
    themeGradient: 'from-amber-400 via-rose-400 to-purple-500',
    accentColor: '#f43f5e',
    isPrimary: false,
    pinCode: '1234', // Default child-lock PIN (easily changed in settings)
    notes: 'Kids chewable multivitamin gummies & DHA Omega-3 gummies for brain development.',
  }
];
