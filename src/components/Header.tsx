import React from 'react';
import { 
  Pill, 
  Sun, 
  Moon, 
  ChevronDown, 
  Heart, 
  Sparkles, 
  User, 
  Shield
} from 'lucide-react';
import { UserProfile, ProfileType } from '../types/profile';
import { DiscordAuthUser } from '../utils/discordAuthClient';

interface HeaderProps {
  activeTab: 'today' | 'supplements' | 'trends' | 'history';
  setActiveTab: (tab: 'today' | 'supplements' | 'trends' | 'history') => void;
  onOpenProfileSwitcher: () => void;
  onOpenAndroidInstall: () => void;
  todayDueCount: number;
  discordUser?: DiscordAuthUser | null;
  onOpenDiscordSecurity?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  activeProfile: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenProfileSwitcher,
  onOpenAndroidInstall,
  todayDueCount,
  discordUser,
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
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Zone 1: Branding & Profile Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Pill className="w-5 h-5 rotate-45" />
          </div>

          <div className="hidden xs:block">
            <span className="font-display font-black text-base tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <span>Supple Pulse</span>
            </span>
          </div>

          {/* Active Profile Badge / Quick Switcher */}
          <button
            onClick={onOpenProfileSwitcher}
            title="Switch Family Profile"
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl border border-stone-200/90 dark:border-stone-700/80 bg-stone-50/80 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700/80 transition text-stone-800 dark:text-stone-200 text-xs font-semibold shadow-2xs cursor-pointer ml-1"
          >
            <span className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
              {getProfileIcon(activeProfile.avatar, activeProfile.type)}
            </span>
            <span className="max-w-[75px] sm:max-w-[105px] truncate font-bold text-stone-900 dark:text-white">
              {activeProfile.name}
            </span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>
        </div>

        {/* Zone 2: Navigation Pills */}
        <nav className="flex items-center gap-1 p-1 bg-stone-100/90 dark:bg-stone-800/80 rounded-2xl border border-stone-200/60 dark:border-stone-700/60">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all relative ${
              activeTab === 'today'
                ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 font-medium'
            }`}
          >
            <span>Today</span>
            {todayDueCount > 0 && (
              <span className={`ml-1.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'today'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300'
              }`}>
                {todayDueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('supplements')}
            className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'supplements'
                ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 font-medium'
            }`}
          >
            Stash
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'trends'
                ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 font-medium'
            }`}
          >
            Trends
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'history'
                ? 'bg-stone-950 text-white shadow-sm ring-1 ring-stone-900 dark:bg-black dark:ring-stone-600'
                : 'bg-white text-stone-900 border border-stone-200/90 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700 hover:bg-stone-50 font-medium'
            }`}
          >
            History
          </button>
        </nav>

        {/* Zone 3: Security & Account Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Discord-Style Security Account Button */}
          {onOpenDiscordSecurity && (
            <button
              onClick={onOpenDiscordSecurity}
              title={discordUser ? `IP Verified Account: ${discordUser.email}` : 'Sign In / Account Security (Discord-Style IP Guard)'}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition shadow-2xs cursor-pointer ${
                discordUser
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-200/90 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${discordUser ? 'text-indigo-600 dark:text-indigo-400' : 'text-white'}`} />
              {discordUser ? (
                <span className="hidden sm:inline text-[11px] truncate max-w-[120px]">
                  {discordUser.displayName || discordUser.email.split('@')[0]}
                </span>
              ) : (
                <span>Account</span>
              )}
            </button>
          )}

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
