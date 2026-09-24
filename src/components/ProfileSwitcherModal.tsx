import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  Sparkles, 
  User, 
  Smile, 
  Heart, 
  ShieldCheck, 
  Baby, 
  Eye, 
  Sliders
} from 'lucide-react';
import { UserProfile, ProfileType } from '../types/supplement';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onAddProfile: (profile: Omit<UserProfile, 'id' | 'createdAt'>) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onDeleteProfile: (profileId: string) => void;
  allFamilyMode: boolean;
  onToggleAllFamilyMode: (enabled: boolean) => void;
  supplementCountByProfile: Record<string, number>;
}

const AVATAR_OPTIONS = [
  { key: 'user', label: 'Person', icon: User, color: 'bg-emerald-500' },
  { key: 'glasses', label: 'Senior / Glasses', icon: Eye, color: 'bg-sky-500' },
  { key: 'heart', label: 'Caring / Heart', icon: Heart, color: 'bg-rose-500' },
  { key: 'bear', label: 'Kids / Bear', icon: Smile, color: 'bg-amber-500' },
  { key: 'sparkles', label: 'Vitality / Sparkle', icon: Sparkles, color: 'bg-violet-500' },
  { key: 'baby', label: 'Toddler / Child', icon: Baby, color: 'bg-pink-500' },
  { key: 'shield', label: 'Wellness Shield', icon: ShieldCheck, color: 'bg-teal-500' },
];

const THEME_COLORS = [
  { key: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500', name: 'Emerald' },
  { key: 'sky', bg: 'bg-sky-500', ring: 'ring-sky-500', name: 'Sky Blue' },
  { key: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500', name: 'Amber' },
  { key: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-500', name: 'Rose' },
  { key: 'violet', bg: 'bg-violet-500', ring: 'ring-violet-500', name: 'Violet' },
  { key: 'teal', bg: 'bg-teal-500', ring: 'ring-teal-500', name: 'Teal' },
];

export const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  allFamilyMode,
  onToggleAllFamilyMode,
  supplementCountByProfile,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Dad');
  const [profileType, setProfileType] = useState<ProfileType>('senior');
  const [avatarIcon, setAvatarIcon] = useState('glasses');
  const [themeColor, setThemeColor] = useState('sky');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setRelationship('Self');
    setProfileType('adult');
    setAvatarIcon('user');
    setThemeColor('emerald');
    setNotes('');
    setErrorMsg('');
    setIsCreating(false);
    setEditingProfileId(null);
  };

  const startCreate = () => {
    setName('');
    setRelationship('Dad');
    setProfileType('senior');
    setAvatarIcon('glasses');
    setThemeColor('sky');
    setNotes('');
    setErrorMsg('');
    setIsCreating(true);
    setEditingProfileId(null);
  };

  const startEdit = (p: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setName(p.name);
    setRelationship(p.relationship);
    setProfileType(p.type);
    setAvatarIcon(p.avatarIcon);
    setThemeColor(p.themeColor);
    setNotes(p.notes || '');
    setErrorMsg('');
    setEditingProfileId(p.id);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a profile name.');
      return;
    }

    if (isCreating) {
      onAddProfile({
        name: name.trim(),
        relationship,
        type: profileType,
        avatarIcon,
        themeColor,
        notes: notes.trim() || undefined,
        isKidsProfile: profileType === 'kid',
      });
      resetForm();
    } else if (editingProfileId) {
      const existing = profiles.find((p) => p.id === editingProfileId);
      if (existing) {
        onUpdateProfile({
          ...existing,
          name: name.trim(),
          relationship,
          type: profileType,
          avatarIcon,
          themeColor,
          notes: notes.trim() || undefined,
          isKidsProfile: profileType === 'kid',
        });
      }
      resetForm();
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (profiles.length <= 1) {
      alert('You cannot delete the only remaining profile.');
      return;
    }
    if (confirm('Are you sure you want to remove this profile? Its supplement logs will remain preserved.')) {
      onDeleteProfile(id);
      if (editingProfileId === id) resetForm();
    }
  };

  const getProfileBgClass = (color: string) => {
    switch (color) {
      case 'sky': return 'from-sky-500 to-blue-600';
      case 'amber': return 'from-amber-500 to-orange-600';
      case 'rose': return 'from-rose-500 to-red-600';
      case 'violet': return 'from-violet-500 to-purple-600';
      case 'teal': return 'from-teal-500 to-cyan-600';
      default: return 'from-emerald-500 to-teal-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                {isCreating ? 'Add Family Profile' : editingProfileId ? 'Edit Profile' : 'Who is taking supplements?'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isCreating || editingProfileId 
                  ? 'Manage supplement schedules, dose reminders & dietary profiles'
                  : 'Switch between personal, parents, and kids regimens on one account'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Profiles Grid (Google TV Style) */}
          {!isCreating && !editingProfileId ? (
            <>
              {/* Family Overview Toggle Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    ALL
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-white">
                      Family Combined Overview
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      View all family members' supplements together on Today's board (great for giving Dad his pills!)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onToggleAllFamilyMode(!allFamilyMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    allFamilyMode
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                  }`}
                >
                  {allFamilyMode ? 'Active on Board' : 'Enable'}
                </button>
              </div>

              {/* Profiles Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profiles.map((p) => {
                  const isActive = !allFamilyMode && activeProfileId === p.id;
                  const count = supplementCountByProfile[p.id] || 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        onToggleAllFamilyMode(false);
                        onSelectProfile(p.id);
                        onClose();
                      }}
                      className={`group relative p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/30'
                          : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-400 dark:hover:border-stone-700 hover:shadow'
                      }`}
                    >
                      {/* Active indicator check */}
                      {isActive && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        {/* Big Colorful Avatar */}
                        <div
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getProfileBgClass(
                            p.themeColor
                          )} text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0`}
                        >
                          {p.type === 'senior' ? (
                            <Eye className="w-7 h-7" />
                          ) : p.type === 'kid' ? (
                            <Smile className="w-7 h-7" />
                          ) : (
                            <User className="w-7 h-7" />
                          )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-stone-900 dark:text-white truncate">
                              {p.name}
                            </h3>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {p.relationship}
                            </span>
                          </div>

                          <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                            {p.notes || `${p.type === 'kid' ? 'Kids gentle protocol' : p.type === 'senior' ? 'Senior wellness regimen' : 'Personal regimen'}`}
                          </p>

                          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-300">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{count} {count === 1 ? 'supplement' : 'supplements'} tracked</span>
                          </div>
                        </div>
                      </div>

                      {/* Edit button */}
                      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-400">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                          {isActive ? 'Current Active Profile' : 'Tap to Switch Profile'}
                        </span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={(e) => startEdit(p, e)}
                            className="p-1.5 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
                            title="Edit profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {profiles.length > 1 && (
                            <button
                              onClick={(e) => handleDelete(p.id, e)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 transition"
                              title="Delete profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Profile Card */}
                <button
                  onClick={startCreate}
                  className="p-6 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all flex flex-col items-center justify-center text-center gap-2 min-h-[160px] group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-500 group-hover:bg-emerald-500 group-hover:text-white transition flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      Add Family Profile
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Add Dad, Mom, Kids, or Partner
                    </p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            /* Create / Edit Form */
            <div className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Profile Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Profile Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dad, Mom, Neelam, Leo"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Relationship & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Relationship
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => {
                      setRelationship(e.target.value);
                      if (e.target.value === 'Dad' || e.target.value === 'Mom') {
                        setProfileType('senior');
                        setAvatarIcon('glasses');
                      } else if (e.target.value === 'Kid' || e.target.value === 'Child') {
                        setProfileType('kid');
                        setAvatarIcon('bear');
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                  >
                    <option value="Self">Self (Me)</option>
                    <option value="Dad">Dad</option>
                    <option value="Mom">Mom</option>
                    <option value="Kid">Kid / Child</option>
                    <option value="Partner">Partner / Spouse</option>
                    <option value="Other">Other Family Member</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Profile Type (Age / Mode)
                  </label>
                  <select
                    value={profileType}
                    onChange={(e) => setProfileType(e.target.value as ProfileType)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                  >
                    <option value="adult">Adult</option>
                    <option value="senior">Senior (High Contrast & Clear Timings)</option>
                    <option value="kid">Kid (Playful & Gentle Reminders)</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              {/* Theme Color */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                  Theme Accent Color
                </label>
                <div className="flex items-center gap-3">
                  {THEME_COLORS.map((tc) => (
                    <button
                      key={tc.key}
                      type="button"
                      onClick={() => setThemeColor(tc.key)}
                      className={`w-8 h-8 rounded-full ${tc.bg} transition-all ${
                        themeColor === tc.key ? `ring-4 ${tc.ring} scale-110 shadow` : 'opacity-80 hover:opacity-100'
                      }`}
                      title={tc.name}
                    />
                  ))}
                </div>
              </div>

              {/* Health / Regimen Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Health Notes or Regimen Focus (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Senior blood pressure protocol, take with food, knee joint wellness..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md transition"
                >
                  {isCreating ? 'Create Profile' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-stone-50/50 dark:bg-stone-900/40 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
          <span>Connected Google Account: {profiles.length} family profiles configured</span>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
