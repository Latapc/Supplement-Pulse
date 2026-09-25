import React, { useState } from 'react';
import { UserProfile, ProfileType } from '../types/profile';
import { 
  Users, 
  User, 
  Heart, 
  Sparkles, 
  ShieldAlert, 
  Plus, 
  Check, 
  X, 
  Lock, 
  Unlock, 
  Edit3, 
  Trash2,
  Tv,
  Star
} from 'lucide-react';
import { triggerHaptic, playSuccessChime } from '../utils/soundEffects';

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onSaveProfiles: (profiles: UserProfile[]) => void;
  onDeleteProfile?: (profileId: string) => void;
}

export const ProfileSwitcherModal: React.FC<ProfileSwitcherModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onSaveProfiles,
  onDeleteProfile,
}) => {
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pinPromptForProfile, setPinPromptForProfile] = useState<UserProfile | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ProfileType>('adult');
  const [formRelation, setFormRelation] = useState('');
  const [formAvatar, setFormAvatar] = useState('user');
  const [formNotes, setFormNotes] = useState('');
  const [formPin, setFormPin] = useState('');

  if (!isOpen) return null;

  const getAvatarIcon = (avatar: string, type: ProfileType, className: string = 'w-7 h-7') => {
    if (avatar === 'heart' || type === 'assisted') return <Heart className={className} />;
    if (avatar === 'sparkles' || type === 'kid') return <Sparkles className={className} />;
    if (avatar === 'star') return <Star className={className} />;
    return <User className={className} />;
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingProfile(null);
    setFormName('');
    setFormType('adult');
    setFormRelation('Family Member');
    setFormAvatar('user');
    setFormNotes('');
    setFormPin('');
  };

  const handleStartEdit = (profile: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreating(false);
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormType(profile.type);
    setFormRelation(profile.relation);
    setFormAvatar(profile.avatar);
    setFormNotes(profile.notes || '');
    setFormPin(profile.pinCode || '');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    triggerHaptic('success');
    playSuccessChime();

    if (isCreating) {
      const newId = `profile_${Date.now()}`;
      const newProfile: UserProfile = {
        id: newId,
        name: formName.trim(),
        type: formType,
        relation: formRelation.trim() || (formType === 'kid' ? 'Kids Profile' : formType === 'assisted' ? 'Assisted Care' : 'Adult Member'),
        avatar: formAvatar,
        themeGradient: formType === 'kid' 
          ? 'from-amber-400 via-rose-400 to-purple-500' 
          : formType === 'assisted' 
          ? 'from-blue-600 to-indigo-800' 
          : 'from-emerald-500 to-teal-700',
        accentColor: formType === 'kid' ? '#f43f5e' : formType === 'assisted' ? '#3b82f6' : '#10b981',
        isPrimary: false,
        pinCode: formType === 'kid' ? (formPin || '1234') : undefined,
        calendarColorId: formType === 'kid' ? '5' : formType === 'assisted' ? '9' : '10',
        notes: formNotes.trim(),
      };
      const updated = [...profiles, newProfile];
      onSaveProfiles(updated);
      onSelectProfile(newId);
    } else if (editingProfile) {
      const updated = profiles.map(p => {
        if (p.id === editingProfile.id) {
          return {
            ...p,
            name: formName.trim(),
            type: formType,
            relation: formRelation.trim(),
            avatar: formAvatar,
            notes: formNotes.trim(),
            pinCode: formType === 'kid' ? (formPin || '1234') : undefined,
          };
        }
        return p;
      });
      onSaveProfiles(updated);
    }

    setEditingProfile(null);
    setIsCreating(false);
  };

  const handleProfileClick = (profile: UserProfile) => {
    const currentActive = profiles.find(p => p.id === activeProfileId);
    if (currentActive?.type === 'kid' && currentActive.pinCode && profile.id !== currentActive.id) {
      setPinPromptForProfile(profile);
      setEnteredPin('');
      setPinError(false);
      return;
    }

    triggerHaptic('light');
    onSelectProfile(profile.id);
    onClose();
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    const currentActive = profiles.find(p => p.id === activeProfileId);
    if (enteredPin === currentActive?.pinCode || enteredPin === '1234') {
      triggerHaptic('success');
      if (pinPromptForProfile) {
        onSelectProfile(pinPromptForProfile.id);
      }
      setPinPromptForProfile(null);
      onClose();
    } else {
      triggerHaptic('medium');
      setPinError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#1a1714] border border-stone-300 dark:border-stone-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Google TV Style */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between bg-stone-100 dark:bg-[#231f1c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-syne text-stone-900 dark:text-white">
                Who's Taking Supplements?
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                Google TV-style family & care profiles under your same Google Account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-white dark:bg-[#1a1714]">
          {/* PIN Lock Prompt if trying to exit Kids profile */}
          {pinPromptForProfile && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/50 text-amber-950 dark:text-amber-100 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Parental Control PIN Required</span>
              </div>
              <p className="text-xs text-amber-850 dark:text-amber-200 font-medium">
                Enter your 4-digit PIN to exit Kids Profile (Default PIN is 1234).
              </p>
              <form onSubmit={handleUnlockPin} className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={enteredPin}
                  onChange={e => {
                    setEnteredPin(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="PIN"
                  className={`w-28 px-3 py-2 text-center text-lg tracking-widest font-mono rounded-xl bg-white dark:bg-stone-800 border ${
                    pinError ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-stone-300 dark:border-stone-600'
                  } text-stone-900 dark:text-white font-bold`}
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Unlock
                </button>
                <button
                  type="button"
                  onClick={() => setPinPromptForProfile(null)}
                  className="px-3 py-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
              </form>
              {pinError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  Incorrect PIN. Try 1234 or your configured code.
                </p>
              )}
            </div>
          )}

          {/* Profile Cards Grid - Google TV Aesthetic */}
          {!editingProfile && !isCreating && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {profiles.map(profile => {
                  const isActive = profile.id === activeProfileId;
                  return (
                    <div
                      key={profile.id}
                      onClick={() => handleProfileClick(profile)}
                      className={`group relative p-4 sm:p-5 rounded-3xl cursor-pointer transition-all duration-200 flex flex-col items-center text-center border-2 ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-500/20'
                          : 'border-stone-300 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-stone-50 dark:bg-[#25211e] hover:scale-[1.02]'
                      }`}
                    >
                      {/* Active Checkmark Pill */}
                      {isActive && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" /> ACTIVE
                        </div>
                      )}

                      {/* Profile Type Badge */}
                      <div className="absolute top-3 left-3">
                        {profile.type === 'kid' ? (
                          <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-200 text-[10px] font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> KIDS
                          </span>
                        ) : profile.type === 'assisted' ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 text-[10px] font-bold flex items-center gap-1">
                            <Heart className="w-3 h-3" /> SENIOR
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 text-[10px] font-bold">
                            PRIMARY
                          </span>
                        )}
                      </div>

                      {/* Avatar Circle */}
                      <div className={`mt-5 w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr ${profile.themeGradient} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200`}>
                        {getAvatarIcon(profile.avatar, profile.type, 'w-9 h-9 sm:w-10 sm:h-10')}
                      </div>

                      {/* Profile Info */}
                      <h3 className="mt-3.5 text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                        {profile.name}
                      </h3>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {profile.relation}
                      </p>

                      {profile.notes && (
                        <p className="mt-2 text-xs font-medium text-stone-700 dark:text-stone-200 line-clamp-2 px-1 leading-relaxed">
                          {profile.notes}
                        </p>
                      )}

                      {/* Edit Button */}
                      <div className="mt-4 pt-3 w-full border-t border-stone-200 dark:border-stone-700 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={e => handleStartEdit(profile, e)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-stone-800 dark:text-stone-100 bg-stone-200/80 hover:bg-stone-300 dark:bg-[#342f2a] dark:hover:bg-[#423c36] flex items-center gap-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Profile Trigger */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-600 hover:border-emerald-500 text-stone-800 dark:text-stone-100 hover:text-emerald-600 dark:hover:text-emerald-400 bg-stone-50 dark:bg-[#231f1c] flex items-center justify-center gap-2 font-bold text-sm transition"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Add Another Family / Care Profile
                </button>
              </div>

              {/* Information Footnote */}
              <div className="p-4 rounded-2xl bg-stone-100 dark:bg-[#231f1c] border border-stone-200 dark:border-stone-700 text-xs text-stone-750 dark:text-stone-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-stone-900 dark:text-white text-xs">
                    Shared Google Account Architecture
                  </p>
                  <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
                    Just like Google TV and YouTube Kids, all profiles are secured within your single Google Account. Dad's heart vitamins and kids' chewables stay neatly segregated while syncing seamlessly to Google Calendar and notifications!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Create / Edit Form */}
          {(isCreating || editingProfile) && (
            <form onSubmit={handleSaveForm} className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-700">
                <h3 className="font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {isCreating ? 'Create New Family Profile' : `Edit ${editingProfile?.name}`}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(null);
                    setIsCreating(false);
                  }}
                  className="text-xs font-bold text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Profile Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dad, Mom, Junior, Myself"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                    Profile Experience
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as ProfileType)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-white text-sm font-semibold"
                  >
                    <option value="adult">Adult (Full View)</option>
                    <option value="assisted">Senior / Assisted (Dad)</option>
                    <option value="kid">Kids (Child-Safe Mode)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                    Relation / Subtitle
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior / Assisted"
                    value={formRelation}
                    onChange={e => setFormRelation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-white text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                    Avatar Icon
                  </label>
                  <select
                    value={formAvatar}
                    onChange={e => setFormAvatar(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-white text-sm font-semibold"
                  >
                    <option value="user">User Person</option>
                    <option value="heart">Heart / Caregiver</option>
                    <option value="sparkles">Sparkles / Kid</option>
                    <option value="star">Star</option>
                  </select>
                </div>
              </div>

              {formType === 'kid' && (
                <div className="p-3.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-300 dark:border-pink-800 text-pink-950 dark:text-pink-100 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Lock className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    <span>Parental Lock PIN</span>
                  </div>
                  <p className="text-xs text-pink-850 dark:text-pink-200 font-medium">
                    Set a 4-digit code required to leave Kids Mode or edit regimens:
                  </p>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="1234"
                    value={formPin}
                    onChange={e => setFormPin(e.target.value.replace(/\D/g, ''))}
                    className="w-28 px-3 py-1.5 font-mono text-center tracking-widest text-sm rounded-lg bg-white dark:bg-stone-800 border border-pink-400 dark:border-pink-700 text-stone-900 dark:text-white font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Health & Care Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Remind Dad to take with warm water after morning meal."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-white text-sm font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-700">
                {editingProfile && !editingProfile.isPrimary && onDeleteProfile ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete profile "${editingProfile.name}"?`)) {
                        onDeleteProfile(editingProfile.id);
                        setEditingProfile(null);
                      }
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Profile
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(null);
                      setIsCreating(false);
                    }}
                    className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
                  >
                    Save Profile
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 bg-stone-100 dark:bg-[#231f1c] border-t border-stone-200 dark:border-stone-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
