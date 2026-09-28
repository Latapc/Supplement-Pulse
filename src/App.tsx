import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  HeroBanner 
} from './components/HeroBanner';
import { 
  TodayDoses 
} from './components/TodayDoses';
import { 
  SupplementCard 
} from './components/SupplementCard';
import { 
  SupplementModal 
} from './components/SupplementModal';
import { 
  TrendsAndGraphs 
} from './components/TrendsAndGraphs';
import { 
  HistoryLogList 
} from './components/HistoryLogList';
import { 
  NotificationBanner 
} from './components/NotificationBanner';
import { ExpiryAlertsBanner } from './components/ExpiryAlertsBanner';
import { AiCoachColumn } from './components/AiCoachColumn';
import { 
  AiChatDrawer, 
  ChatActionSnapshot 
} from './components/AiChatDrawer';
import { GoogleAccountSyncModal } from './components/GoogleAccountSyncModal';
import { ProfileSwitcherModal } from './components/ProfileSwitcherModal';
import { GoogleCalendarModal } from './components/GoogleCalendarModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { DiscordSecurityModal } from './components/DiscordSecurityModal';
import { 
  DiscordAuthUser, 
  getStoredDiscordUser, 
  setStoredDiscordUser 
} from './utils/discordAuthClient';
import { User } from 'firebase/auth';
import { 
  initGoogleAuth, 
  signInWithGoogle, 
  signOutFromGoogle, 
  getGoogleAccessToken,
  getOAuthAccessToken,
  findDriveBackupFile, 
  downloadFromDrive, 
  uploadToDrive, 
  deleteDriveFile,
  CloudRegimenData,
  GoogleUserProfile
} from './utils/googleDriveSync';

import { 
  Supplement, 
  DoseLog, 
  TodaySupplementStatus 
} from './types/supplement';
import { UserProfile, INITIAL_PROFILES } from './types/profile';
import { 
  loadSupplements, 
  saveSupplements, 
  loadDoseLogs, 
  saveDoseLogs, 
  loadProfiles,
  saveProfiles,
  loadActiveProfileId,
  saveActiveProfileId,
  resetToDemoData 
} from './utils/storage';
import { 
  calculateTodayStatus, 
  formatDateToYYYYMMDD, 
  calculateEndDate 
} from './utils/dates';
import { 
  playChimeSound 
} from './utils/audio';
import { 
  playReminderChime, 
  triggerHaptic, 
  playSuccessChime 
} from './utils/soundEffects';
import { 
  Plus, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  Bell, 
  Calendar 
} from 'lucide-react';

export default function App() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'supplements' | 'trends' | 'history'>('today');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<Supplement | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSpecialMode, setChatSpecialMode] = useState<boolean>(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);

  // Google TV Family & Multi-Profile States
  const [profiles, setProfiles] = useState<UserProfile[]>(() => loadProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => loadActiveProfileId());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // New Integration Modals (Google Calendar, Device Notifications, Android APK)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [discordUser, setDiscordUser] = useState<DiscordAuthUser | null>(() => getStoredDiscordUser());
  const [isDiscordSecurityOpen, setIsDiscordSecurityOpen] = useState(false);

  // Discord-Style Security Regimen Handlers
  const handleDiscordUserChange = async (user: DiscordAuthUser | null) => {
    setDiscordUser(user);
    setStoredDiscordUser(user);
    if (user) {
      try {
        const res = await fetch(`/api/sync/load?userId=account_${user.id}`);
        const data = await res.json();
        if (data?.data?.supplements && Array.isArray(data.data.supplements) && data.data.supplements.length > 0) {
          setSupplements(data.data.supplements);
          saveSupplements(data.data.supplements);
          if (data.data.logs) {
            setLogs(data.data.logs);
            saveDoseLogs(data.data.logs);
          }
          setToastMessage(`Logged in! Loaded ${data.data.supplements.length} supplement regimens.`);
          return;
        }
      } catch (err) {
        console.warn('Could not load user data:', err);
      }
      setToastMessage(`Signed in as ${user.displayName || user.email} (IP Verified)`);
    } else {
      setToastMessage('Signed out of Discord Security account.');
    }
  };

  const handleDiscordSyncRegimen = async () => {
    if (!discordUser) return;
    const payload: CloudRegimenData = {
      version: 1,
      appName: 'Supple Pulse',
      updatedAt: new Date().toISOString(),
      userEmail: discordUser.email,
      supplements,
      logs,
      dismissedDoses,
    };
    await fetch('/api/sync/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `account_${discordUser.id}`, payload }),
    });
  };

  const handleDiscordRestoreRegimen = async () => {
    if (!discordUser) return;
    const res = await fetch(`/api/sync/load?userId=account_${discordUser.id}`);
    const data = await res.json();
    if (data?.data?.supplements) {
      setSupplements(data.data.supplements);
      saveSupplements(data.data.supplements);
      if (data.data.logs) {
        setLogs(data.data.logs);
        saveDoseLogs(data.data.logs);
      }
      setToastMessage(`Restored ${data.data.supplements.length} supplements from cloud!`);
    } else {
      setToastMessage('No backup found yet for this account. Click Back Up Now to save.');
    }
  };

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || profiles[0] || INITIAL_PROFILES[0];
  }, [profiles, activeProfileId]);

  const profileMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);

  const handleSelectProfile = (id: string) => {
    setActiveProfileId(id);
    saveActiveProfileId(id);
    triggerHaptic('light');
    const p = profiles.find((item) => item.id === id);
    setToastMessage(`Switched profile to ${p?.name || 'User'} (${p?.relation || ''})`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfiles = (newProfiles: UserProfile[]) => {
    setProfiles(newProfiles);
    saveProfiles(newProfiles);
  };

  const handleDeleteProfile = (profileId: string) => {
    const updated = profiles.filter((p) => p.id !== profileId);
    setProfiles(updated);
    saveProfiles(updated);
    if (activeProfileId === profileId) {
      setActiveProfileId('profile_self');
      saveActiveProfileId('profile_self');
    }
    setToastMessage('Profile deleted.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenSpecialChat = (prompt?: string) => {
    setChatSpecialMode(true);
    setChatInitialPrompt(prompt || 'Boron 6 mg: take every day for 2 weeks, then break for 1 week, repeat for life');
    setIsChatOpen(true);
  };

  const handleOpenStandardChat = () => {
    setChatSpecialMode(false);
    setChatInitialPrompt(undefined);
    setIsChatOpen(true);
  };
  
  // Real-time clock for live countdowns (updates every 10 seconds)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Notification permission with persistent sound/alert enablement
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined') {
      const savedAlerts = localStorage.getItem('suppletrack_alerts_enabled');
      if (savedAlerts === 'true') return 'granted';
      if (typeof Notification !== 'undefined') {
        return Notification.permission;
      }
    }
    return 'default';
  });
  
  // In-app toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const notifiedDosesRef = useRef<Set<string>>(new Set());

  // Global Theme Mode: 'light' | 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('suppletrack_theme_mode');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('suppletrack_theme_mode', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      setToastMessage(nextTheme === 'dark' ? 'Switched to Dark Mode' : 'Switched to Light Mode');
      setTimeout(() => setToastMessage(null), 2500);
      return nextTheme;
    });
  };

  // Initialize data from localStorage on mount
  useEffect(() => {
    const loadedSupps = loadSupplements();
    const loadedLogs = loadDoseLogs();
    setSupplements(loadedSupps);
    setLogs(loadedLogs);
  }, []);

  // Clock ticker for live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Notification checker (checks every 30 seconds if any dose is due right now)
  useEffect(() => {
    const checkDosesDue = () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = formatDateToYYYYMMDD(now);

      supplements.forEach((supp) => {
        // Only if course is active
        const status = calculateTodayStatus(
          supp,
          logs.filter((l) => l.date === todayStr),
          now,
          dismissedDoses[todayStr] || []
        );

        if (!status.isScheduledToday || !status.isCourseActive || status.isFullyTaken || status.isDismissedToday) {
          return;
        }

        const notificationKey = `${supp.id}_${todayStr}_${currentTimeStr}`;
        if (supp.doseTime && supp.doseTime === currentTimeStr && !notifiedDosesRef.current.has(notificationKey)) {
          notifiedDosesRef.current.add(notificationKey);

          // Play gentle double chime
          playChimeSound('dose_due');

          // Trigger native notification
          try {
            const notif = new Notification('Supple Pulse: Dose Due Now', {
              body: `Time to take your scheduled ${supp.doseAmount.toLocaleString()} ${supp.unit} of ${supp.name}!`,
              icon: '/app-logo.png',
            });
            notif.onclick = () => {
              window.focus();
              setActiveTab('today');
            };
          } catch (e) {
            console.warn('Failed to dispatch notification:', e);
          }

          setToastMessage(`Reminder: Time to take your ${supp.name} (${supp.doseAmount} ${supp.unit})!`);
        }
      });
    };

    const interval = setInterval(checkDosesDue, 30000);
    return () => clearInterval(interval);
  }, [supplements, logs]);

  // Request browser / device notification permission
  const handleRequestNotificationPermission = async () => {
    localStorage.setItem('suppletrack_alerts_enabled', 'true');
    setNotificationPermission('granted');
    playChimeSound('dose_taken');
    triggerHaptic('medium');

    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          try {
            new Notification('Supple Pulse Alerts Activated', {
              body: 'You will receive timely reminders when your scheduled supplements are due.',
            });
          } catch {
            // Fallback for WebViews
          }
        }
      } catch (e) {
        console.warn('Notification permission request error:', e);
      }
    }
    setToastMessage('Dose alerts & sound chime reminders activated!');
  };

  // Test notification button
  const handleSendTestNotification = () => {
    playChimeSound('dose_due');
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Supple Pulse Test Reminder', {
        body: 'This is how your supplement dose reminder will appear when scheduled!',
      });
    }
    setToastMessage('Test reminder chime and notification triggered!');
  };

  // Sound test
  const handleTestSound = () => {
    playChimeSound('dose_due');
    setToastMessage('Played reminder chime');
  };

  // Track manually dismissed / deleted doses for specific dates
  const [dismissedDoses, setDismissedDoses] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('suppletrack_dismissed_doses_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Google Account Cloud Sync State
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | User | any | null>(null);
  const [hasDriveAccess, setHasDriveAccess] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [cloudFileId, setCloudFileId] = useState<string | null>(null);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState<boolean>(false);
  const autoSyncTimeoutRef = useRef<any>(null);
  const isFirstLoadRef = useRef<boolean>(true);

  // Initialize Google Auth state listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(async (user, token) => {
      setGoogleUser(user);
      setHasDriveAccess(!!token);
      if (user && token) {
        try {
          const found = await findDriveBackupFile(token);
          if (found) {
            setCloudFileId(found.id);
            setLastSyncedTime(new Date(found.modifiedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        } catch (e) {
          console.error('Error looking up Drive file:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Google Sign-In Action
  const handleSignInWithGoogle = async (customEmail?: string) => {
    setIsSyncing(true);
    try {
      const { user, accessToken } = await signInWithGoogle(customEmail);
      setGoogleUser(user);
      setHasDriveAccess(true);

      // Look for existing file in Google Cloud Store
      const existing = await findDriveBackupFile(accessToken);
      if (existing) {
        setCloudFileId(existing.id);
        const cloudData = await downloadFromDrive(accessToken, existing.id);
        if (cloudData && Array.isArray(cloudData.supplements) && cloudData.supplements.length > 0) {
          // Sync cloud data to local state
          setSupplements(cloudData.supplements);
          saveSupplements(cloudData.supplements);
          if (cloudData.logs) {
            setLogs(cloudData.logs);
            saveDoseLogs(cloudData.logs);
          }
          if (cloudData.dismissedDoses) {
            setDismissedDoses(cloudData.dismissedDoses);
            localStorage.setItem('suppletrack_dismissed_doses_v1', JSON.stringify(cloudData.dismissedDoses));
          }
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastSyncedTime(timeStr);
          setToastMessage(`Google Drive connected! Synced ${cloudData.supplements.length} supplement regimens.`);
          return;
        }
      }

      // If no file exists in Drive yet, create initial backup with current local data
      const payload: CloudRegimenData = {
        version: 1,
        appName: 'Supple Pulse',
        updatedAt: new Date().toISOString(),
        userEmail: user.email || undefined,
        supplements,
        logs,
        dismissedDoses,
      };
      const result = await uploadToDrive(accessToken, payload, existing?.id);
      setCloudFileId(result.fileId);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(timeStr);
      setToastMessage('Google Drive connected! Initial regimen saved to cloud.');
    } catch (e: any) {
      console.error('Google Sign-in error:', e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Sign-Out
  const handleSignOutGoogle = async () => {
    await signOutFromGoogle();
    setGoogleUser(null);
    setHasDriveAccess(false);
    setCloudFileId(null);
    setLastSyncedTime(null);
    setToastMessage('Disconnected from Google Account.');
  };

  // Upload/Sync current state to Drive
  const handleSyncToDrive = async () => {
    let token = getGoogleAccessToken();
    if (!token) {
      const res = await signInWithGoogle();
      token = res.accessToken;
      setGoogleUser(res.user);
      setHasDriveAccess(true);
    }
    setIsSyncing(true);
    try {
      const payload: CloudRegimenData = {
        version: 1,
        appName: 'Supple Pulse',
        updatedAt: new Date().toISOString(),
        userEmail: googleUser?.email || undefined,
        supplements,
        logs,
        dismissedDoses,
      };
      const result = await uploadToDrive(token, payload, cloudFileId);
      setCloudFileId(result.fileId);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(timeStr);
      setToastMessage(`Synced to Google Drive (${timeStr})`);
    } catch (e: any) {
      console.error('Error syncing to drive:', e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  // Restore state from Google Drive
  const handleRestoreFromDrive = async () => {
    let token = getGoogleAccessToken();
    if (!token) {
      const res = await signInWithGoogle();
      token = res.accessToken;
      setGoogleUser(res.user);
      setHasDriveAccess(true);
    }
    setIsSyncing(true);
    try {
      let fileId = cloudFileId;
      if (!fileId) {
        const found = await findDriveBackupFile(token);
        if (!found) {
          throw new Error('No Supple Pulse backup file found in your Google Drive.');
        }
        fileId = found.id;
        setCloudFileId(found.id);
      }
      const cloudData = await downloadFromDrive(token, fileId);
      if (!cloudData || !Array.isArray(cloudData.supplements)) {
        throw new Error('Invalid data format in Google Drive file.');
      }
      setSupplements(cloudData.supplements);
      saveSupplements(cloudData.supplements);
      if (cloudData.logs) {
        setLogs(cloudData.logs);
        saveDoseLogs(cloudData.logs);
      }
      if (cloudData.dismissedDoses) {
        setDismissedDoses(cloudData.dismissedDoses);
        localStorage.setItem('suppletrack_dismissed_doses_v1', JSON.stringify(cloudData.dismissedDoses));
      }
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(timeStr);
      setToastMessage(`Restored ${cloudData.supplements.length} supplements from Google Drive!`);
    } catch (e: any) {
      console.error('Error restoring from drive:', e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete cloud backup file
  const handleDeleteCloudBackup = async () => {
    const token = getGoogleAccessToken();
    if (!token || !cloudFileId) {
      throw new Error('Cannot delete file: No active Google Drive session or file ID.');
    }
    setIsSyncing(true);
    try {
      await deleteDriveFile(token, cloudFileId);
      setCloudFileId(null);
      setLastSyncedTime(null);
      setToastMessage('Google Drive backup file removed.');
    } catch (e: any) {
      console.error('Error deleting cloud file:', e);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync debounced effect: automatically sync changes to Drive when connected
  useEffect(() => {
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      return;
    }
    const token = getGoogleAccessToken();
    if (!googleUser || !token || !hasDriveAccess) return;

    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }

    autoSyncTimeoutRef.current = setTimeout(async () => {
      try {
        const payload: CloudRegimenData = {
          version: 1,
          appName: 'Supple Pulse',
          updatedAt: new Date().toISOString(),
          userEmail: googleUser.email || undefined,
          supplements,
          logs,
          dismissedDoses,
        };
        const result = await uploadToDrive(token, payload, cloudFileId);
        setCloudFileId(result.fileId);
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        console.error('Auto-sync to Google Drive error:', e);
      }
    }, 2500);

    return () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
      }
    };
  }, [supplements, logs, dismissedDoses, googleUser, hasDriveAccess, cloudFileId]);

  // Calculate today's status for all supplements
  const todayDateStr = formatDateToYYYYMMDD(currentTime);
  const dismissedTodayIds = useMemo(() => dismissedDoses[todayDateStr] || [], [dismissedDoses, todayDateStr]);

  const todayLogs = useMemo(() => {
    return logs.filter((l) => l.date === todayDateStr);
  }, [logs, todayDateStr]);

  const todayStatuses: TodaySupplementStatus[] = useMemo(() => {
    return supplements.map((supp) => calculateTodayStatus(supp, todayLogs, currentTime, dismissedTodayIds));
  }, [supplements, todayLogs, currentTime, dismissedTodayIds]);

  // Supplements expired or nearing expiry
  const expiredSupplements = useMemo(() => {
    return todayStatuses.filter((s) => s.expiryStatus?.isExpired);
  }, [todayStatuses]);

  const nearingExpirySupplements = useMemo(() => {
    return todayStatuses.filter((s) => s.expiryStatus?.isNearingExpiry && !s.expiryStatus?.isExpired);
  }, [todayStatuses]);

  const todayDueCount = useMemo(() => {
    return todayStatuses.filter((s) => s.isScheduledToday && !s.isFullyTaken && !s.isDismissedToday).length;
  }, [todayStatuses]);

  // Take dose action
  const handleTakeDose = (supplement: Supplement, amount?: number, notes?: string) => {
    const amountToLog = amount || supplement.doseAmount;
    const now = new Date();
    const dateStr = formatDateToYYYYMMDD(now);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    const newLog: DoseLog = {
      id: `log-${Date.now()}`,
      profileId: supplement.profileId || activeProfileId || 'profile_self',
      supplementId: supplement.id,
      supplementName: supplement.name,
      amountTaken: amountToLog,
      unit: supplement.unit,
      timestamp: now.toISOString(),
      date: dateStr,
      time: timeStr,
      notes: notes || undefined,
    };

    triggerHaptic('success');
    playSuccessChime();

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    saveDoseLogs(updatedLogs);

    // Update inventory stock if tracking is enabled
    if (supplement.inventory?.trackStock) {
      const remaining = Math.max(0, (supplement.inventory.currentStock || 0) - 1);
      const updatedSupp: Supplement = {
        ...supplement,
        inventory: {
          ...supplement.inventory,
          currentStock: remaining,
        },
      };
      const updatedSupplements = supplements.map((s) => (s.id === supplement.id ? updatedSupp : s));
      setSupplements(updatedSupplements);
      saveSupplements(updatedSupplements);

      if (remaining <= (supplement.inventory.lowStockThreshold || 7)) {
        setToastMessage(`Logged dose! Alert: ${supplement.name} is running low (${remaining} ${supplement.inventory.unit || 'units'} left).`);
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }
    }

    setToastMessage(`Logged ${amountToLog.toLocaleString()} ${supplement.unit} of ${supplement.name}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Refill supplement bottle inventory
  const handleRefillStock = (supplementId: string, customAmount?: number) => {
    const target = supplements.find((s) => s.id === supplementId);
    if (!target || !target.inventory) return;

    const refillAmount = customAmount || target.inventory.bottleSize || 60;
    const updatedSupp: Supplement = {
      ...target,
      inventory: {
        ...target.inventory,
        currentStock: refillAmount,
        lastRestockedDate: formatDateToYYYYMMDD(new Date()),
      },
    };

    const updated = supplements.map((s) => (s.id === supplementId ? updatedSupp : s));
    setSupplements(updated);
    saveSupplements(updated);
    playChimeSound('dose_taken');
    setToastMessage(`Refilled ${target.name} supply to ${refillAmount} ${target.inventory.unit}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Undo today's dose mark
  const handleUndoDose = (supplementId: string) => {
    const todayStr = formatDateToYYYYMMDD(currentTime);
    const updatedLogs = logs.filter((l) => !(l.supplementId === supplementId && l.date === todayStr));
    setLogs(updatedLogs);
    saveDoseLogs(updatedLogs);
    setToastMessage('Cleared today\'s logged dose.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete / dismiss scheduled dosage for today
  const handleDeleteDoseToday = (supplementId: string) => {
    const updatedList = Array.from(new Set([...dismissedTodayIds, supplementId]));
    const updated = {
      ...dismissedDoses,
      [todayDateStr]: updatedList,
    };
    setDismissedDoses(updated);
    try {
      localStorage.setItem('suppletrack_dismissed_doses_v1', JSON.stringify(updated));
    } catch {}

    // Also remove today's logs for this supplement if any were recorded
    const updatedLogs = logs.filter((l) => !(l.supplementId === supplementId && l.date === todayDateStr));
    setLogs(updatedLogs);
    saveDoseLogs(updatedLogs);

    const supp = supplements.find((s) => s.id === supplementId);
    setToastMessage(`Deleted today's dosage for ${supp?.name || 'supplement'}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Restore scheduled dosage for today
  const handleRestoreDoseToday = (supplementId: string) => {
    const updatedList = dismissedTodayIds.filter((id) => id !== supplementId);
    const updated = {
      ...dismissedDoses,
      [todayDateStr]: updatedList,
    };
    setDismissedDoses(updated);
    try {
      localStorage.setItem('suppletrack_dismissed_doses_v1', JSON.stringify(updated));
    } catch {}

    const supp = supplements.find((s) => s.id === supplementId);
    setToastMessage(`Restored dosage for ${supp?.name || 'supplement'}.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save supplement (add or edit)
  const handleSaveSupplement = (supplement: Supplement) => {
    let updated: Supplement[];
    const exists = supplements.some((s) => s.id === supplement.id);
    if (exists) {
      updated = supplements.map((s) => (s.id === supplement.id ? supplement : s));
    } else {
      updated = [supplement, ...supplements];
    }
    setSupplements(updated);
    saveSupplements(updated);
    setToastMessage(`Saved ${supplement.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete supplement
  const handleDeleteSupplement = (supplementId: string) => {
    const target = supplements.find((s) => s.id === supplementId);
    const updated = supplements.filter((s) => s.id !== supplementId);
    setSupplements(updated);
    saveSupplements(updated);
    setToastMessage(`Deleted ${target?.name || 'supplement'} protocol.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Renew / Extend course
  const handleRenewCourse = (supplement: Supplement) => {
    const todayStr = formatDateToYYYYMMDD(new Date());
    const periodValue = supplement.duration.periodValue || 3;
    const periodUnit = supplement.duration.periodUnit || 'months';
    const newEnd = calculateEndDate(todayStr, periodValue, periodUnit);

    const renewed: Supplement = {
      ...supplement,
      duration: {
        ...supplement.duration,
        startDate: todayStr,
        endDate: newEnd,
      },
    };

    handleSaveSupplement(renewed);
    setToastMessage(`Renewed ${supplement.name} for ${periodValue} ${periodUnit}!`);
  };

  // Add manual past log entry
  const handleAddManualLog = (manualData: Omit<DoseLog, 'id'>) => {
    const newLog: DoseLog = {
      id: `log-${Date.now()}`,
      ...manualData,
    };
    const updated = [newLog, ...logs];
    setLogs(updated);
    saveDoseLogs(updated);
    setToastMessage(`Added dose record for ${manualData.supplementName}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete single log entry from history
  const handleDeleteLog = (logId: string) => {
    const updated = logs.filter((l) => l.id !== logId);
    setLogs(updated);
    saveDoseLogs(updated);
    setToastMessage('Log entry deleted.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Chatbot Actions Implementation
  const handleApplyChatAction = (
    action: {
      type: string;
      description: string;
      supplement?: Partial<Supplement>;
      supplementId?: string;
      doseLog?: { supplementId: string; amountTaken: number; notes?: string };
    },
    snapshot: ChatActionSnapshot
  ) => {
    if (action.type === 'add_supplement' && action.supplement) {
      const todayStr = formatDateToYYYYMMDD(new Date());
      const pVal = action.supplement.duration?.periodValue || 3;
      const pUnit = action.supplement.duration?.periodUnit || 'months';
      const durationType = action.supplement.duration?.type || 'fixed';
      const calculatedEnd = durationType === 'infinity' ? undefined : (action.supplement.duration?.endDate || calculateEndDate(todayStr, pVal, pUnit));

      const newSupp: Supplement = {
        id: `supp-${Date.now()}`,
        name: action.supplement.name || 'Custom Supplement',
        doseAmount: Number(action.supplement.doseAmount) || 1000,
        unit: action.supplement.unit || 'mg',
        form: action.supplement.form || 'capsule',
        category: action.supplement.category || 'vitamins',
        colorTag: 'emerald',
        frequencyType: action.supplement.frequencyType || 'weekly',
        selectedDays: action.supplement.selectedDays || [1],
        intervalDays: action.supplement.intervalDays,
        doseTime: action.supplement.doseTime || '09:00',
        foodTiming: action.supplement.foodTiming || 'with_food',
        cycleConfig: action.supplement.cycleConfig,
        inventory: action.supplement.inventory || {
          trackStock: true,
          currentStock: 30,
          bottleSize: 60,
          unit: action.supplement.unit === 'capsules' ? 'capsules' : 'doses',
          lowStockThreshold: 7,
          lastRestockedDate: todayStr,
        },
        expiryDate: action.supplement.expiryDate,
        duration: {
          type: durationType,
          startDate: action.supplement.duration?.startDate || todayStr,
          endDate: calculatedEnd,
          periodValue: durationType === 'fixed' ? pVal : undefined,
          periodUnit: durationType === 'fixed' ? pUnit : undefined,
        },
        notes: action.supplement.notes || 'Added by AI Assistant',
        createdAt: new Date().toISOString(),
      };

      const updated = [newSupp, ...supplements];
      setSupplements(updated);
      saveSupplements(updated);
      setToastMessage(`AI: Added ${newSupp.name}`);
      setTimeout(() => setToastMessage(null), 4000);
    } else if (action.type === 'delete_supplement' && action.supplementId) {
      const updated = supplements.filter((s) => s.id !== action.supplementId);
      setSupplements(updated);
      saveSupplements(updated);
      setToastMessage('AI: Removed supplement');
      setTimeout(() => setToastMessage(null), 3000);
    } else if (action.type === 'log_dose' && action.doseLog) {
      const target = supplements.find((s) => s.id === action.doseLog?.supplementId);
      if (target) {
        handleTakeDose(target, action.doseLog.amountTaken, action.doseLog.notes);
      }
    }
  };

  // Chatbot Undo Handler
  const handleUndoChatAction = (snapshot: ChatActionSnapshot) => {
    setSupplements(snapshot.previousSupplements);
    saveSupplements(snapshot.previousSupplements);
    setLogs(snapshot.previousLogs);
    saveDoseLogs(snapshot.previousLogs);
    setToastMessage(`Reverted: ${snapshot.description}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Reset to default preset demo data
  const handleResetData = () => {
    if (window.confirm('Reset all supplements and logs to default starting presets?')) {
      const { supps, logs: seedLogs, profiles: seedProfiles } = resetToDemoData();
      setSupplements(supps);
      setLogs(seedLogs);
      if (seedProfiles) setProfiles(seedProfiles);
      setActiveProfileId('profile_self');
      setToastMessage('Reset to default supplement regimen & family profiles.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notificationsEnabled={notificationPermission === 'granted'}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        onOpenCalendarSync={() => setIsCalendarModalOpen(true)}
        onOpenProfileSwitcher={() => setIsProfileModalOpen(true)}
        onOpenAndroidInstall={() => setIsAndroidModalOpen(true)}
        todayDueCount={todayDueCount}
        googleUser={googleUser}
        discordUser={discordUser}
        isSyncing={isSyncing}
        hasDriveAccess={hasDriveAccess}
        onOpenGoogleSync={() => setIsGoogleSyncModalOpen(true)}
        onOpenDiscordSecurity={() => setIsDiscordSecurityOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeProfile={activeProfile}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-stone-800 animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dynamic Tab Views */}
        {activeTab === 'today' && (
          <>
            {/* Hero Banner with summary (Displayed ONLY in Today section as requested) */}
            <HeroBanner
              todayStatuses={todayStatuses}
              currentDate={currentTime}
              onOpenAddModal={() => {
                setEditingSupplement(null);
                setIsAddModalOpen(true);
              }}
            />

            {/* Expiry Alerts Banner (proactive alerts for expired and nearing-expiry stock) */}
            <ExpiryAlertsBanner
              expiredList={expiredSupplements}
              nearingExpiryList={nearingExpirySupplements}
              onOpenEdit={(supp) => {
                setEditingSupplement(supp);
                setIsAddModalOpen(true);
              }}
              onRefillStock={handleRefillStock}
            />

            {/* Notification Permission Request Banner (if not yet granted) */}
            {notificationPermission !== 'granted' && (
              <NotificationBanner
                permission={notificationPermission}
                onRequestPermission={handleRequestNotificationPermission}
                onSendTestNotification={handleSendTestNotification}
                onTestSound={handleTestSound}
              />
            )}

            {/* AI Coach Column in Today View */}
            <AiCoachColumn
              section="today"
              onOpenChat={(prompt, special) => {
                if (special) {
                  handleOpenSpecialChat(prompt);
                } else if (prompt) {
                  setChatSpecialMode(false);
                  setChatInitialPrompt(prompt);
                  setIsChatOpen(true);
                } else {
                  handleOpenStandardChat();
                }
              }}
              supplementsCount={supplements.length}
            />

            <TodayDoses
              todayStatuses={todayStatuses}
              allSupplements={supplements}
              todayLogs={todayLogs}
              onTakeDose={handleTakeDose}
              onUndoDose={handleUndoDose}
              onDeleteLog={handleDeleteLog}
              onDeleteDoseToday={handleDeleteDoseToday}
              onRestoreDoseToday={handleRestoreDoseToday}
              onDeleteSupplement={handleDeleteSupplement}
              onOpenAddModal={() => {
                setEditingSupplement(null);
                setIsAddModalOpen(true);
              }}
              onSelectSupplement={(s) => {
                setEditingSupplement(s);
                setIsAddModalOpen(true);
              }}
              onRefillStock={handleRefillStock}
              currentTime={currentTime}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelectProfile={handleSelectProfile}
              onOpenProfileSwitcher={() => setIsProfileModalOpen(true)}
            />
          </>
        )}

        {activeTab === 'supplements' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white font-display">
                  My Supplement Stash
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Manage weekly dosing schedules, lifetime infinity protocols, and cyclic micro-nutrients
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenSpecialChat()}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100 bg-amber-300 dark:bg-amber-900/90 hover:bg-amber-400 dark:hover:bg-amber-800 border border-amber-400/90 dark:border-amber-700 rounded-xl transition shadow-xs active:scale-[0.98]"
                  title="Special Protocols: Cyclic intake (e.g. Boron 2w on / 1w off), custom intervals, infinity"
                >
                  <Sparkles className="w-4 h-4 text-amber-900 dark:text-amber-300" />
                  <span>Special</span>
                </button>

                <button
                  onClick={() => {
                    setEditingSupplement(null);
                    setIsAddModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white rounded-xl transition shadow-xs w-fit"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Supplement</span>
                </button>
              </div>
            </div>

            {/* AI Coach Column in Stash View */}
            <AiCoachColumn
              section="stash"
              onOpenChat={(prompt, special) => {
                if (special) {
                  handleOpenSpecialChat(prompt);
                } else if (prompt) {
                  setChatSpecialMode(false);
                  setChatInitialPrompt(prompt);
                  setIsChatOpen(true);
                } else {
                  handleOpenStandardChat();
                }
              }}
              supplementsCount={supplements.length}
            />

            {/* Active Regimens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {todayStatuses.map((status) => (
                <SupplementCard
                  key={status.supplement.id}
                  supplement={status.supplement}
                  status={status}
                  profile={profileMap.get(status.supplement.profileId || 'profile_self')}
                  onEdit={(s) => {
                    setEditingSupplement(s);
                    setIsAddModalOpen(true);
                  }}
                  onDelete={handleDeleteSupplement}
                  onRenewCourse={handleRenewCourse}
                  onQuickLog={(s) => handleTakeDose(s)}
                  onRefillStock={handleRefillStock}
                />
              ))}
            </div>

            {supplements.length === 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <p className="text-stone-600 font-medium mb-3">No supplements registered yet.</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-semibold"
                >
                  Create Your First Regimen
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trends' && (
          <TrendsAndGraphs
            supplements={supplements}
            logs={logs}
            currentDate={currentTime}
          />
        )}

        {activeTab === 'history' && (
          <HistoryLogList
            logs={logs}
            supplements={supplements}
            onDeleteLog={handleDeleteLog}
            onAddManualLog={handleAddManualLog}
            onRefreshData={() => {
              setSupplements(loadSupplements());
              setLogs(loadDoseLogs());
            }}
            googleUser={googleUser}
            hasDriveAccess={hasDriveAccess}
            isSyncing={isSyncing}
            lastSyncedTime={lastSyncedTime}
            onOpenGoogleSync={() => setIsGoogleSyncModalOpen(true)}
            onQuickSyncToDrive={handleSyncToDrive}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white/50 py-6 text-stone-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800 font-display">Supple Pulse</span>
            <span aria-hidden="true">·</span>
            <span>Intelligent Supplement & Vitamin Intake Protocol</span>
          </div>

          <div className="flex items-center gap-4 text-stone-500">
            <button
              onClick={handleSendTestNotification}
              className="hover:text-stone-900 transition"
            >
              Test Alert System
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={handleResetData}
              className="hover:text-stone-900 transition"
            >
              Reset Demo Data
            </button>
          </div>
        </div>
      </footer>

      {/* Add / Edit Supplement Modal */}
      <SupplementModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingSupplement(null);
        }}
        onSave={handleSaveSupplement}
        editingSupplement={editingSupplement}
        onOpenSpecialAi={() => handleOpenSpecialChat()}
        profiles={profiles}
        activeProfileId={activeProfileId}
      />

      {/* Google TV Family & Multi-Profile Switcher Modal */}
      <ProfileSwitcherModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={handleSelectProfile}
        onSaveProfiles={handleSaveProfiles}
        onDeleteProfile={handleDeleteProfile}
      />

      {/* Google Calendar Sync Modal */}
      <GoogleCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        supplements={supplements}
        profiles={profiles}
        userEmail={googleUser?.email}
      />

      {/* Device & Browser Dose Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        activeProfileName={activeProfile.name}
      />

      {/* Android APK & Mobile Application Hub Modal */}
      <AndroidInstallModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      {/* Discord-Style Security & IP Authorization Modal */}
      <DiscordSecurityModal
        isOpen={isDiscordSecurityOpen}
        onClose={() => setIsDiscordSecurityOpen(false)}
        currentUser={discordUser}
        onUserChange={handleDiscordUserChange}
        onSyncRegimen={handleDiscordSyncRegimen}
        onRestoreRegimen={handleDiscordRestoreRegimen}
        localSupplementsCount={supplements.length}
      />

      {/* Google Account Cloud Sync Modal */}
      <GoogleAccountSyncModal
        isOpen={isGoogleSyncModalOpen}
        onClose={() => setIsGoogleSyncModalOpen(false)}
        user={googleUser}
        hasDriveAccess={hasDriveAccess}
        isSyncing={isSyncing}
        lastSyncedTime={lastSyncedTime}
        cloudFileId={cloudFileId}
        localSupplementsCount={supplements.length}
        localLogsCount={logs.length}
        onSignIn={handleSignInWithGoogle}
        onSignOut={handleSignOutGoogle}
        onSyncToDrive={handleSyncToDrive}
        onRestoreFromDrive={handleRestoreFromDrive}
        onDeleteCloudBackup={handleDeleteCloudBackup}
      />

      {/* AI Chat Drawer */}
      <AiChatDrawer
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatSpecialMode(false);
          setChatInitialPrompt(undefined);
        }}
        supplements={supplements}
        logs={logs}
        onApplyChatAction={handleApplyChatAction}
        onUndoAction={handleUndoChatAction}
        specialMode={chatSpecialMode}
        initialPrompt={chatInitialPrompt}
      />

    </div>
  );
}
