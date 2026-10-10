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

export type NavTab = 'today' | 'calendar' | 'supplements' | 'trends' | 'history';

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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-900 transition-colors w-full max-w-full">
      {/* Row 1: Top Bar with Branding, Profile Switcher & Actions */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-1.5 sm:gap-2">
        
        {/* Mobile menu + Branding & Profile Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} className="sm:hidden w-10 h-10 rounded-xl flex items-center justify-center text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800">
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

        {/* Right: Security, Android App & Theme Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Google Calendar Hub Quick Action Button */}
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            title="Google Calendar Hub - View Supplement Dosing Days"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-2xl border transition shadow-xs cursor-pointer shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-blue-50/90 hover:bg-blue-100 text-blue-900 border-blue-200/90 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800'
            }`}
          >
            <CalendarIcon className={`w-3.5 h-3.5 ${activeTab === 'calendar' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
            <span className="font-bold text-[11px] sm:text-xs">Calendar</span>
          </button>

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-stone-200/80 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-900/60 text-amber-500 hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />}
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Dedicated Navigation Tabs (Full Width - Today, Calendar, Stash, Trends, History) */}
      <div className="hidden sm:block max-w-5xl mx-auto px-3 sm:px-6 pb-2.5 pt-0.5 w-full">
        <nav className="grid grid-cols-5 gap-1 sm:gap-2 w-full">
          <button
            onClick={() => setActiveTab('today')}
            className={`py-1.5 px-1 sm:px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
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
            onClick={() => setActiveTab('calendar')}
            className={`py-1.5 px-1 sm:px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center gap-1 cursor-pointer truncate ${
              activeTab === 'calendar'
                ? 'bg-blue-600 text-white border border-blue-500 shadow-xs font-bold'
                : 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('supplements')}
            className={`py-1.5 px-1 sm:px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center cursor-pointer truncate ${
              activeTab === 'supplements'
                ? 'bg-stone-900 dark:bg-stone-800 text-white border border-stone-800 dark:border-stone-600 shadow-xs font-bold'
                : 'bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-800 font-medium'
            }`}
          >
            <span className="truncate">Stash</span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`py-1.5 px-1 sm:px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center cursor-pointer truncate ${
              activeTab === 'trends'
                ? 'bg-stone-900 dark:bg-stone-800 text-white border border-stone-800 dark:border-stone-600 shadow-xs font-bold'
                : 'bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-800 font-medium'
            }`}
          >
            <span className="truncate">Trends</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-1.5 px-1 sm:px-2 text-xs sm:text-sm font-semibold rounded-full transition-all text-center flex items-center justify-center cursor-pointer truncate ${
              activeTab === 'history'
                ? 'bg-stone-900 dark:bg-stone-800 text-white border border-stone-800 dark:border-stone-600 shadow-xs font-bold'
                : 'bg-stone-100/90 dark:bg-stone-900/60 text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800/70 hover:bg-stone-200 dark:hover:bg-stone-800 font-medium'
            }`}
          >
            <span className="truncate">History</span>
          </button>
        </nav>
      </div>
      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <button type="button" aria-label="Close navigation menu" className="fixed inset-x-0 top-14 bottom-0 z-[65] bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <nav aria-label="Main navigation" className="fixed left-0 top-14 bottom-0 z-[70] w-[82vw] max-w-[320px] overflow-y-auto overscroll-contain bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100 border-r border-stone-200 dark:border-stone-800 shadow-2xl p-4 flex flex-col gap-2">
            <div className="px-3 py-3 mb-1">
              <p className="text-xs uppercase tracking-[0.16em] font-bold text-emerald-700 dark:text-emerald-400">Supple Pulse</p>
              <p className="text-lg font-bold text-stone-900 dark:text-white mt-1">Your dashboard</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Jump to any section</p>
            </div>
            {([["today", "Today", "Daily doses and overview"], ["calendar", "Calendar", "Schedule and reminders"], ["supplements", "Stash", "Your saved supplements"], ["trends", "Trends & Insights", "Progress and charts"], ["history", "Dose History", "Past dose records"]] as const).map(([tab, label, description]) => (
              <button key={tab} type="button" onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }} aria-current={activeTab === tab ? "page" : undefined} className={"w-full text-left rounded-2xl px-4 py-3 transition border " + (activeTab === tab ? "bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-100" : "border-transparent text-stone-800 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-900")}>
                <span className="block text-sm font-bold">{label}</span><span className="block text-xs mt-0.5 opacity-70">{description}</span>
              </button>
            ))}
            <div className="mt-auto rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900">
              <p className="text-xs uppercase tracking-wider font-bold text-stone-500 dark:text-stone-400">Profile</p>
              <p className="text-sm font-bold text-stone-900 dark:text-white mt-2 truncate">{activeProfile.name}</p>
              <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenProfileSwitcher(); }} className="mt-3 w-full text-left rounded-xl px-3 py-2 text-sm font-semibold text-stone-800 dark:text-stone-100 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">Switch profile</button>
              {onOpenDiscordSecurity && <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenDiscordSecurity(); }} className="mt-2 w-full text-left rounded-xl px-3 py-2 text-sm font-semibold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800"><span className="flex items-center gap-2"><Shield className="w-4 h-4" />{discordUser ? 'Account & Cloud Sync' : 'Sign in / Account'}</span>{discordUser?.email && <span className="block text-xs mt-1 opacity-75 truncate">{discordUser.email}</span>}</button>}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
