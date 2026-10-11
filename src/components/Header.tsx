import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  ChevronDown, 
  Heart, 
  Sparkles, 
  User, 
  Shield,
  Calendar as CalendarIcon,
  Menu,
  X
} from 'lucide-react';
import { UserProfile, ProfileType } from '../types/profile';
import { DiscordAuthUser } from '../utils/discordAuthClient';
import { CapsuleLogo } from './CapsuleLogo';
import { MobileNavigationDrawer } from './MobileNavigationDrawer';

export type NavTab = 'today' | 'supplements' | 'trends' | 'history';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenProfileSwitcher: () => void;
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
  todayDueCount,
  discordUser,
  onOpenDiscordSecurity,
  theme = 'light',
  onToggleTheme,
  activeProfile,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const getProfileIcon = (avatar: string, type: ProfileType) => {
    if (avatar === 'heart' || type === 'assisted') return <Heart className="w-3.5 h-3.5" />;
    if (avatar === 'sparkles' || type === 'kid') return <Sparkles className="w-3.5 h-3.5" />;
    return <User className="w-3.5 h-3.5" />;
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-900 transition-colors w-full max-w-full">
      {/* Row 1: Top Bar with Branding, Profile Switcher & Actions */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-2">
        
        {/* Mobile menu + Branding & Profile Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} className="sm:hidden w-10 h-10 rounded-xl flex items-center justify-center text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {/* Vertical Upright Capsule Logo with Prominent Middle Line */}
          <div 
            title="Supple Pulse" 
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
          >
            <CapsuleLogo className="w-full h-full" />
          </div>

          {/* Active Profile Badge / Quick Switcher */}
          <button
            onClick={onOpenProfileSwitcher}
            title="Switch Family Profile"
            className="flex items-center gap-1 py-1 px-1.5 sm:px-2 rounded-xl border border-stone-200/90 dark:border-stone-800/80 bg-stone-100/80 dark:bg-stone-900/60 hover:bg-stone-200/70 dark:hover:bg-stone-800/80 transition text-stone-800 dark:text-stone-200 text-xs font-semibold shadow-2xs cursor-pointer shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-emerald-700/90 text-white flex items-center justify-center shrink-0">
              {getProfileIcon(activeProfile.avatar, activeProfile.type)}
            </span>
            <span className="hidden sm:inline max-w-[110px] truncate font-bold text-stone-900 dark:text-white">
              {activeProfile.name}
            </span>
            <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
          </button>
        </div>

        {/* Right: Theme Toggle Action */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="w-8 h-8 rounded-full border border-stone-200/80 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-900/60 text-amber-500 hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Dedicated Navigation Tabs (Today, Stash, Trends & Insights, History) */}
      <div className="hidden sm:block max-w-5xl mx-auto px-3 sm:px-6 pb-2.5 pt-0.5 w-full">
        <nav className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
          <button
            onClick={() => setActiveTab('today')}
            className={`py-1.5 px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
              activeTab === 'today'
                ? 'bg-stone-900 dark:bg-stone-800 text-white border border-stone-800 dark:border-stone-600 shadow-xs font-bold'
                : 'bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-800 font-medium'
            }`}
          >
            <span className="truncate">Today</span>
            {todayDueCount > 0 ? (
              <span className="shrink-0 text-[10px] sm:text-xs">({todayDueCount})</span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('supplements')}
            className={`py-1.5 px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center cursor-pointer truncate ${
              activeTab === 'supplements'
                ? 'bg-stone-900 dark:bg-stone-800 text-white border border-stone-800 dark:border-stone-600 shadow-xs font-bold'
                : 'bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-800 font-medium'
            }`}
          >
            <span className="truncate">Stash</span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`py-1.5 px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center cursor-pointer truncate ${
              activeTab === 'trends'
                ? 'bg-stone-900 dark:bg-stone-800 text-white border border-stone-800 dark:border-stone-600 shadow-xs font-bold'
                : 'bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-800 font-medium'
            }`}
          >
            <span className="truncate">Trends & Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-1.5 px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center cursor-pointer truncate ${
              activeTab === 'history'
                ? 'bg-stone-900 dark:bg-stone-800 text-white border border-stone-800 dark:border-stone-600 shadow-xs font-bold'
                : 'bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-800 font-medium'
            }`}
          >
            <span className="truncate">History</span>
          </button>
        </nav>
      </div>
    </header>

    {/* Separate Portal-based Mobile Navigation Drawer */}
    <MobileNavigationDrawer
      isOpen={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      todayDueCount={todayDueCount}
      activeProfile={activeProfile}
      onOpenProfileSwitcher={onOpenProfileSwitcher}
      discordUser={discordUser}
      onOpenDiscordSecurity={onOpenDiscordSecurity}
      theme={theme}
      onToggleTheme={onToggleTheme}
    />
  </>
);
};
