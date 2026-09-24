import React from 'react';
import { Pill, Bell, BellOff, Volume2, Cloud, Sun, Moon, Calendar as CalendarIcon, Smartphone, Users, ChevronDown } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types/supplement';

interface HeaderProps {
  activeTab: 'today' | 'supplements' | 'trends' | 'history';
  setActiveTab: (tab: 'today' | 'supplements' | 'trends' | 'history') => void;
  notificationsEnabled: boolean;
  onOpenNotifications: () => void;
  onTestSound: () => void;
  todayDueCount: number;
  googleUser?: User | null;
  isSyncing?: boolean;
  hasDriveAccess?: boolean;
  onOpenGoogleSync?: () => void;
  onOpenCalendarSync?: () => void;
  onOpenMobileApp?: () => void;
  onOpenProfileSwitcher?: () => void;
  activeProfile: UserProfile;
  allFamilyMode?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  notificationsEnabled,
  onOpenNotifications,
  onTestSound,
  todayDueCount,
  googleUser,
  isSyncing = false,
  hasDriveAccess = false,
  onOpenGoogleSync,
  onOpenCalendarSync,
  onOpenMobileApp,
  onOpenProfileSwitcher,
  activeProfile,
  allFamilyMode = false,
  theme = 'light',
  onToggleTheme,
}) => {
  const getProfileBadgeBg = (color: string) => {
    switch (color) {
      case 'sky': return 'bg-sky-500 text-white';
      case 'amber': return 'bg-amber-500 text-white';
      case 'rose': return 'bg-rose-500 text-white';
      case 'violet': return 'bg-violet-500 text-white';
      case 'teal': return 'bg-teal-500 text-white';
      default: return 'bg-emerald-500 text-white';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 w-full">
        
        {/* Zone 1: Brand Wordmark & Profile Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-900 dark:bg-stone-800 text-white flex items-center justify-center shadow-sm border border-stone-800 dark:border-stone-700 shrink-0">
            <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 -rotate-45" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display shrink-0 hidden xs:inline">
            SuppleTrack
          </span>

          {/* Profile Switcher Trigger (Google TV Style) */}
          {onOpenProfileSwitcher && (
            <button
              onClick={onOpenProfileSwitcher}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-xs font-semibold text-stone-800 dark:text-stone-200 shadow-2xs ml-1"
              title="Switch family member profile"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                allFamilyMode ? 'bg-indigo-600 text-white' : getProfileBadgeBg(activeProfile.themeColor)
              }`}>
                {allFamilyMode ? 'ALL' : activeProfile.name.charAt(0)}
              </div>
              <span className="max-w-[85px] sm:max-w-[120px] truncate">
                {allFamilyMode ? 'All Family' : activeProfile.name}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>
          )}
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-1.5 text-xs rounded-xl transition-all relative flex items-center gap-1.5 ${
              activeTab === 'today'
                ? 'bg-stone-950 text-white font-bold shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 font-medium shadow-2xs'
            }`}
          >
            <span>Today's Regimen</span>
            {todayDueCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                activeTab === 'today' ? 'bg-emerald-500 text-white' : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
              }`}>
                {todayDueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('supplements')}
            className={`px-3.5 py-1.5 text-xs rounded-xl transition-all ${
              activeTab === 'supplements'
                ? 'bg-stone-950 text-white font-bold shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 font-medium shadow-2xs'
            }`}
          >
            Supplements Stash
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3.5 py-1.5 text-xs rounded-xl transition-all ${
              activeTab === 'trends'
                ? 'bg-stone-950 text-white font-bold shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 font-medium shadow-2xs'
            }`}
          >
            Trends
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-stone-950 text-white font-bold shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 font-medium shadow-2xs'
            }`}
          >
            History
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Google Calendar Integration Button */}
          {onOpenCalendarSync && (
            <button
              onClick={onOpenCalendarSync}
              title="Connect & sync regimen to Google Calendar"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition shadow-2xs"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Google Calendar</span>
            </button>
          )}

          {/* Android Mobile / APK Button */}
          {onOpenMobileApp && (
            <button
              onClick={onOpenMobileApp}
              title="Install on Android Mobile or Generate APK"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-stone-700 dark:text-stone-300 hover:text-sky-700 dark:hover:text-sky-300 transition shadow-2xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Android / APK</span>
            </button>
          )}

          {/* Google Account Cloud Backup */}
          {onOpenGoogleSync && (
            <button
              onClick={onOpenGoogleSync}
              title={googleUser ? `Google Account: ${googleUser.email}` : 'Sign in with Google'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition shadow-2xs ${
                googleUser
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-800'
              }`}
            >
              {googleUser ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Cloud'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden md:inline">Cloud</span>
                </>
              )}
            </button>
          )}

          {/* Notification settings modal toggle */}
          <button
            onClick={onOpenNotifications}
            title={notificationsEnabled ? 'Dose notifications active (tap to configure)' : 'Configure dose reminders & alarms'}
            className={`p-2 rounded-xl transition-colors relative ${
              notificationsEnabled
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/80'
            }`}
            aria-label="Notifications"
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {notificationsEnabled && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-900" />
            )}
          </button>

          {/* Global Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all shadow-2xs active:scale-95 shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-stone-700 dark:text-stone-300" />
              )}
            </button>
          )}
        </div>

      </div>

      {/* Mobile Nav strip */}
      <div className="lg:hidden flex items-center justify-around px-2 py-2 border-t border-stone-200/90 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-900/90 gap-1">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-1.5 px-2 text-xs rounded-xl whitespace-nowrap text-center transition-all ${
            activeTab === 'today'
              ? 'bg-stone-950 text-white font-bold shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
              : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 font-medium'
          }`}
        >
          Today {todayDueCount > 0 ? `(${todayDueCount})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('supplements')}
          className={`flex-1 py-1.5 px-2 text-xs rounded-xl whitespace-nowrap text-center transition-all ${
            activeTab === 'supplements'
              ? 'bg-stone-950 text-white font-bold shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
              : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 font-medium'
          }`}
        >
          Stash
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex-1 py-1.5 px-2 text-xs rounded-xl whitespace-nowrap text-center transition-all ${
            activeTab === 'trends'
              ? 'bg-stone-950 text-white font-bold shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
              : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 font-medium'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 px-2 text-xs rounded-xl whitespace-nowrap text-center transition-all ${
            activeTab === 'history'
              ? 'bg-stone-950 text-white font-bold shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
              : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 font-medium'
          }`}
        >
          History
        </button>
      </div>
    </header>
  );
};
