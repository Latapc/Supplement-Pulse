import React from 'react';
import { 
  Pill, 
  Bell, 
  Calendar, 
  Cloud, 
  Sun, 
  Moon, 
  ChevronDown, 
  Heart, 
  Sparkles, 
  User, 
  Tv,
  Check,
  Shield
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile, ProfileType } from '../types/profile';
import { DiscordAuthUser } from '../utils/discordAuthClient';

interface HeaderProps {
  activeTab: 'today' | 'supplements' | 'trends' | 'history';
  setActiveTab: (tab: 'today' | 'supplements' | 'trends' | 'history') => void;
  notificationsEnabled: boolean;
  onOpenNotifications: () => void;
  onOpenCalendarSync: () => void;
  onOpenProfileSwitcher: () => void;
  onOpenAndroidInstall: () => void;
  todayDueCount: number;
  googleUser?: FirebaseUser | null;
  discordUser?: DiscordAuthUser | null;
  isSyncing?: boolean;
  hasDriveAccess?: boolean;
  onOpenGoogleSync?: () => void;
  onOpenDiscordSecurity?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  activeProfile: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  notificationsEnabled,
  onOpenNotifications,
  onOpenCalendarSync,
  onOpenProfileSwitcher,
  onOpenAndroidInstall,
  todayDueCount,
  googleUser,
  discordUser,
  isSyncing = false,
  onOpenGoogleSync,
  onOpenDiscordSecurity,
  theme = 'light',
  onToggleTheme,
  activeProfile,
}) => {
  const getProfileIcon = (avatar: string, type: ProfileType) => {
    if (avatar === 'heart' || type === 'assisted') return <Heart className="w-3.5 h-3.5" />;
    if (avatar === 'sparkles' || type === 'kid') return <Sparkles className="w-3.5 h-3.5" />;
    return <User className="w-3.5 h-3.5" />;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 w-full">
        
        {/* Zone 1: Brand & Profile Switcher (Google TV Style) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img 
            src="/app-logo.png" 
            alt="Supple Pulse Icon" 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shrink-0" 
          />
          <span className="hidden sm:inline text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 font-display shrink-0">
            Supple Pulse
          </span>

          {/* Profile Switcher Pill - Google TV style */}
          <button
            onClick={onOpenProfileSwitcher}
            title={`Active Profile: ${activeProfile.name} (${activeProfile.relation}). Tap to switch profiles.`}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/80 hover:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 transition shadow-2xs group"
          >
            <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${activeProfile.themeGradient} text-white flex items-center justify-center text-xs shadow-xs group-hover:scale-105 transition-transform`}>
              {getProfileIcon(activeProfile.avatar, activeProfile.type)}
            </div>
            <div className="text-left hidden xs:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-900 dark:text-white leading-tight">
                  {activeProfile.name}
                </span>
                {activeProfile.type === 'kid' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300">
                    KIDS
                  </span>
                )}
                {activeProfile.type === 'assisted' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    DAD
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-colors" />
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all relative flex items-center gap-1.5 ${
              activeTab === 'today'
                ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 font-medium'
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
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'supplements'
                ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 font-medium'
            }`}
          >
            Supplements
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'trends'
                ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 font-medium'
            }`}
          >
            Analytics
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 font-medium'
            }`}
          >
            History
          </button>
        </nav>

        {/* Zone 3: Actions & Integrations */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Google Calendar Sync Button */}
          <button
            onClick={onOpenCalendarSync}
            title="Google Calendar Integration: Sync dose reminders to calendar"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Calendar</span>
          </button>

          {/* Dose Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            title="Configure notifications, reminder chimes, and haptics"
            className={`p-2 rounded-xl transition-colors relative ${
              notificationsEnabled
                ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            {notificationsEnabled && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-stone-900" />
            )}
          </button>

          {/* Discord-Style Security / IP Guard Button */}
          {onOpenDiscordSecurity && (
            <button
              onClick={onOpenDiscordSecurity}
              title={discordUser ? `IP Verified Account: ${discordUser.email}` : 'Discord-Style Security: Email & IP Authorized Login'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition shadow-2xs cursor-pointer ${
                discordUser
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-200/90 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${discordUser ? 'text-indigo-600 dark:text-indigo-400' : 'text-white'}`} />
              {discordUser ? (
                <span className="hidden sm:inline text-[11px] truncate max-w-[100px]">
                  {discordUser.displayName || discordUser.email.split('@')[0]}
                </span>
              ) : (
                <span>Security Sign-In</span>
              )}
            </button>
          )}

          {/* Google Account / Drive Sync Button */}
          {onOpenGoogleSync && (
            <button
              onClick={onOpenGoogleSync}
              title={googleUser ? `Connected: ${googleUser.email}` : 'Sign in with Google'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl border transition shadow-2xs ${
                googleUser
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-white text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700'
              }`}
            >
              {googleUser ? (
                <>
                  {googleUser.photoURL ? (
                    <img 
                      src={googleUser.photoURL} 
                      alt={googleUser.displayName || 'Google'} 
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-full object-cover border border-emerald-400"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-[11px] truncate max-w-[110px] font-medium">
                    {googleUser.displayName?.split(' ')[0] || googleUser.email?.split('@')[0]}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.13z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z" />
                  </svg>
                  <span className="hidden sm:inline">Google Sign-In</span>
                </>
              )}
            </button>
          )}

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition shadow-2xs shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-stone-700" />
              )}
            </button>
          )}
        </div>

      </div>

      {/* Mobile Nav Strip */}
      <div className="lg:hidden flex items-center justify-around px-2 py-2 border-t border-stone-200/90 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-900/90 gap-1">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-1.5 px-2 text-xs rounded-xl whitespace-nowrap text-center transition-all ${
            activeTab === 'today'
              ? 'bg-stone-950 text-white font-bold shadow-sm dark:bg-black'
              : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 font-medium'
          }`}
        >
          Today {todayDueCount > 0 ? `(${todayDueCount})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('supplements')}
          className={`flex-1 py-1.5 px-2 text-xs rounded-xl whitespace-nowrap text-center transition-all ${
            activeTab === 'supplements'
              ? 'bg-stone-950 text-white font-bold shadow-sm dark:bg-black'
              : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 font-medium'
          }`}
        >
          Stash
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex-1 py-1.5 px-2 text-xs rounded-xl whitespace-nowrap text-center transition-all ${
            activeTab === 'trends'
              ? 'bg-stone-950 text-white font-bold shadow-sm dark:bg-black'
              : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 font-medium'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 px-2 text-xs rounded-xl whitespace-nowrap text-center transition-all ${
            activeTab === 'history'
              ? 'bg-stone-950 text-white font-bold shadow-sm dark:bg-black'
              : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 font-medium'
          }`}
        >
          History
        </button>
      </div>
    </header>
  );
};
