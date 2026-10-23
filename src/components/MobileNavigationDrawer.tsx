import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar, 
  Pill, 
  TrendingUp, 
  History, 
  Shield, 
  Sun, 
  Moon, 
  Heart, 
  Sparkles, 
  User,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { NavTab } from './Header';
import { UserProfile, ProfileType } from '../types/profile';
import { GoogleUser } from '../types/auth';
import { CapsuleLogo } from './CapsuleLogo';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  todayDueCount: number;
  activeProfile: UserProfile;
  onOpenProfileSwitcher: () => void;
  googleUser?: GoogleUser | null;
  onOpenCloudBackup?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const MobileNavigationDrawer: React.FC<MobileNavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  todayDueCount,
  activeProfile,
  onOpenProfileSwitcher,
  googleUser,
  onOpenCloudBackup,
  theme = 'light',
  onToggleTheme,
}) => {
  // Lock body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const getProfileIcon = (avatar: string, type: ProfileType) => {
    if (avatar === 'heart' || type === 'assisted') return <Heart className="w-4 h-4" />;
    if (avatar === 'sparkles' || type === 'kid') return <Sparkles className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const navItems: { tab: NavTab; label: string; description: string; icon: React.ReactNode; badge?: number }[] = [
    {
      tab: 'today',
      label: 'Today',
      description: 'Daily doses, timetable & intake checklist',
      icon: <Calendar className="w-5 h-5" />,
      badge: todayDueCount > 0 ? todayDueCount : undefined,
    },
    {
      tab: 'supplements',
      label: 'Stash',
      description: 'Saved supplements, doses & schedules',
      icon: <Pill className="w-5 h-5" />,
    },
    {
      tab: 'trends',
      label: 'Trends & Insights',
      description: 'Interactive calendar & adherence analytics',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      tab: 'history',
      label: 'Dose History',
      description: 'Complete past intake logs & timestamps',
      icon: <History className="w-5 h-5" />,
    },
  ];

  return createPortal(
    <div 
      className="fixed inset-0"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}
      role="dialog" 
      aria-modal="true" 
      aria-label="Mobile Navigation Menu"
    >
      {/* Dark backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200 cursor-pointer"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out drawer sheet */}
      <div 
        className="fixed inset-y-0 left-0 w-[85vw] max-w-[340px] h-full bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 shadow-2xl flex flex-col p-5 overflow-y-auto overscroll-contain border-r border-stone-200 dark:border-stone-800 transition-all duration-200"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(85vw, 340px)',
          height: '100%',
          zIndex: 1000000,
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Top Header: Branding & Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/80 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
              <CapsuleLogo className="w-full h-full" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-extrabold text-emerald-700 dark:text-emerald-400">
                Supple Pulse
              </p>
              <h2 className="text-base font-bold text-stone-900 dark:text-white leading-tight">
                Menu
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tab Links */}
        <div className="py-4 space-y-2 flex-1">
          <p className="px-2 text-[11px] uppercase font-bold tracking-wider text-stone-400 dark:text-stone-400">
            Navigation
          </p>
          {navItems.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => {
                  onSelectTab(item.tab);
                  onClose();
                }}
                className={`w-full text-left rounded-2xl p-3.5 transition flex items-center gap-3 cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 shadow-xs'
                    : 'bg-stone-50/70 dark:bg-stone-900/40 border-stone-200/70 dark:border-stone-800/80 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-extrabold rounded-full bg-emerald-600 text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-70 truncate mt-0.5">{item.description}</p>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 opacity-40 ${isActive ? 'text-emerald-700 dark:text-emerald-300' : ''}`} />
              </button>
            );
          })}
        </div>

        {/* Bottom Section: Active Profile, Account & Security, Theme Toggle */}
        <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 space-y-3 shrink-0">
          {/* Active Family Profile Card */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 p-3.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
              <span>Active Profile</span>
              <span className="text-emerald-700 dark:text-emerald-400 capitalize">{activeProfile.type}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  {getProfileIcon(activeProfile.avatar, activeProfile.type)}
                </span>
                <span className="text-sm font-bold text-stone-900 dark:text-white truncate">
                  {activeProfile.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProfileSwitcher();
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
              >
                Switch
              </button>
            </div>
          </div>

          {/* Google Drive Cloud Backup */}
          {onOpenCloudBackup && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCloudBackup();
              }}
              className="w-full text-left rounded-2xl p-3.5 text-xs font-semibold text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-sm">
                      {googleUser ? 'Google Drive Backup' : 'Connect Google Drive'}
                    </span>
                    <span className="block text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {googleUser ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate inline-block max-w-[170px]">
                          ● {googleUser.email}
                        </span>
                      ) : (
                        'Private AppData Sync & Backup'
                      )}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </div>
            </button>
          )}

          {/* Quick Theme Toggle & Close Button */}
          <div className="flex items-center gap-2 pt-1">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-stone-600" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold hover:bg-stone-800 dark:hover:bg-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Close Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
