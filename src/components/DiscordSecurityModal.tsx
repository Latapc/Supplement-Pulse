import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  LogOut, 
  Laptop, 
  Trash2, 
  ExternalLink, 
  ArrowRight,
  Eye,
  EyeOff,
  CloudUpload,
  CloudDownload,
  Inbox,
  KeyRound
} from 'lucide-react';
import { 
  DiscordAuthUser, 
  SecurityEmailLog,
  registerWithDiscordSecurity, 
  loginWithDiscordSecurity, 
  checkIpAuthorizationStatus, 
  verifyTokenDirectly, 
  resendVerificationEmail, 
  fetchRecentSecurityEmails, 
  revokeAuthorizedIp, 
  logoutDiscordUser,
  getClientIp,
  promptSaveCredentialsToManager,
  saveCredentialsToAndroidOrWeb,
  requestAndroidCredentials,
  requestSavedPasswordCredentials,
  isAndroidCredentialManagerAvailable,
  enableScreenshotProtection,
  disableScreenshotProtection,
  getApiUrl
} from '../utils/discordAuthClient';
import { signInWithGoogleCalendar } from '../utils/googleCalendar';

interface DiscordSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DiscordAuthUser | null;
  onUserChange: (user: DiscordAuthUser | null) => void;
  onSyncRegimen?: () => Promise<void>;
  onRestoreRegimen?: () => Promise<void>;
  localSupplementsCount?: number;
}

export const DiscordSecurityModal: React.FC<DiscordSecurityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  onSyncRegimen,
  onRestoreRegimen,
  localSupplementsCount = 0,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password suggestion & keyboard autofill bar state
  const [suggestedPassword, setSuggestedPassword] = useState('');
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  // Generate Google-style high entropy strong password
  const generateNewSuggestion = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*-_+=';
    const all = uppercase + lowercase + digits + symbols;

    let strong = '';
    strong += uppercase[Math.floor(Math.random() * uppercase.length)];
    strong += lowercase[Math.floor(Math.random() * lowercase.length)];
    strong += digits[Math.floor(Math.random() * digits.length)];
    strong += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 0; i < 11; i++) {
      strong += all[Math.floor(Math.random() * all.length)];
    }
    return strong.split('').sort(() => 0.5 - Math.random()).join('');
  };

  useEffect(() => {
    // Listen for credentials selected from Android Jetpack CredentialManager bottom sheet
    const handleAndroidCreds = (e: any) => {
      const detail = e.detail;
      if (detail?.email) setEmail(detail.email);
      if (detail?.password) setPassword(detail.password);
      setSuccessMsg('Google Password Manager: Account filled!');
      setTimeout(() => setSuccessMsg(null), 3000);
    };

    const handleAndroidSaved = (e: any) => {
      if (e.detail?.success) {
        setSuccessMsg('Saved to Google Password Manager!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    };

    window.addEventListener('onAndroidCredentialsReceived', handleAndroidCreds as EventListener);
    window.addEventListener('onAndroidCredentialsSaved', handleAndroidSaved as EventListener);
    return () => {
      window.removeEventListener('onAndroidCredentialsReceived', handleAndroidCreds as EventListener);
      window.removeEventListener('onAndroidCredentialsSaved', handleAndroidSaved as EventListener);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSuggestedPassword(generateNewSuggestion());

      // Ensure screenshot protection is completely disabled so users can capture screenshots
      disableScreenshotProtection();

      // If opening login tab, trigger saved credentials bottom sheet
      if (tab === 'login') {
        requestSavedPasswordCredentials(true).then((cred) => {
          if (cred?.id) {
            setEmail(cred.id);
            if (cred.password) setPassword(cred.password);
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, tab]);

  const handleApplySuggestedPassword = () => {
    const toApply = suggestedPassword || generateNewSuggestion();
    setPassword(toApply);
    setShowPassword(true);
    setIsPasswordFocused(false);

    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(toApply);
      }
    } catch {}

    setSuccessMsg('Suggested strong password applied & copied to clipboard!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Quick 1-tap strong password generator (for devices where keyboard hides autofill)
  const handleQuickSuggestPassword = () => {
    handleApplySuggestedPassword();
  };

  // Current client IP
  const [currentIp, setCurrentIp] = useState<string>('Detecting...');

  // Pending IP verification state (Discord style)
  const [pendingAuth, setPendingAuth] = useState<{
    token: string;
    email: string;
    ip: string;
    type: 'registration_verify' | 'new_ip_login';
    verificationLink?: string;
  } | null>(null);

  // Security Mailbox / Email preview
  const [showMailbox, setShowMailbox] = useState(false);
  const [recentEmails, setRecentEmails] = useState<SecurityEmailLog[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Polling ref
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch client IP on open
  useEffect(() => {
    if (isOpen) {
      getClientIp().then(setCurrentIp);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // Load recent emails when mailbox is opened
  const loadEmails = async (targetEmail?: string) => {
    const list = await fetchRecentSecurityEmails(targetEmail || email || currentUser?.email);
    setRecentEmails(list);
  };

  useEffect(() => {
    if (showMailbox) {
      loadEmails();
    }
  }, [showMailbox]);

  // Polling for IP authorization (Discord-like live listener!)
  useEffect(() => {
    if (!pendingAuth?.token) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const poll = async () => {
      try {
        const res = await checkIpAuthorizationStatus(pendingAuth.token);
        if (res.authorized && res.user) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setPendingAuth(null);
          onUserChange(res.user);
          setSuccessMsg(`✅ IP ${res.user.currentIp || pendingAuth.ip} authorized! Logged in successfully.`);
          setTimeout(() => setSuccessMsg(null), 4000);
        }
      } catch (err: any) {
        if (err?.message?.includes('expired')) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setErrorMsg('Authorization link expired. Please request a new one.');
        }
      }
    };

    pollTimerRef.current = setInterval(poll, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [pendingAuth]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Email and password are required');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    const targetEmail = email.trim();
    const targetPassword = password;
    const targetName = displayName.trim() || undefined;

    // Prompt Google Password Manager / Android Credential Manager to save credentials
    saveCredentialsToAndroidOrWeb({
      email: targetEmail,
      password: targetPassword,
      displayName: targetName,
    });

    try {
      const res = await registerWithDiscordSecurity({
        email: targetEmail,
        password: targetPassword,
        displayName: targetName,
      });

      if (res.authorized && res.user) {
        onUserChange(res.user);
        setSuccessMsg(`Welcome, ${res.user.displayName}! Account created & device authorized.`);
        setTimeout(() => setSuccessMsg(null), 3500);
        saveCredentialsToAndroidOrWeb({
          email: targetEmail,
          password: targetPassword,
          displayName: targetName,
        });
      } else if (res.requiresIpVerification) {
        setPendingAuth({
          token: res.token,
          email: res.email,
          ip: res.ip,
          type: 'registration_verify',
          verificationLink: res.verificationLink,
        });
        loadEmails(res.email);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Email and password are required');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    const targetEmail = email.trim();
    const targetPassword = password;

    // Prompt Google Password Manager / Android Credential Manager
    saveCredentialsToAndroidOrWeb({
      email: targetEmail,
      password: targetPassword,
      displayName: targetEmail.split('@')[0],
    });

    try {
      const res = await loginWithDiscordSecurity({
        email: targetEmail,
        password: targetPassword,
      });

      if (res.authorized && res.user) {
        // Known IP - logged in immediately!
        onUserChange(res.user);
        setSuccessMsg(`Welcome back, ${res.user.displayName}! (IP Verified)`);
        setTimeout(() => setSuccessMsg(null), 3500);
        saveCredentialsToAndroidOrWeb({
          email: targetEmail,
          password: targetPassword,
          displayName: targetEmail.split('@')[0],
        });
      } else if (res.requiresIpVerification) {
        // NEW IP detected - Discord style verification email sent!
        setPendingAuth({
          token: res.token,
          email: res.email,
          ip: res.ip,
          type: res.type || 'new_ip_login',
          verificationLink: res.verificationLink,
        });
        loadEmails(res.email);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleOneTapSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { user: gUser } = await signInWithGoogleCalendar();
      if (gUser) {
        const clientIp = currentIp || (await getClientIp());
        const authedUser: DiscordAuthUser = {
          id: gUser.uid,
          email: gUser.email || 'user@gmail.com',
          displayName: gUser.displayName || 'Google User',
          authorizedIps: [clientIp],
          currentIp: clientIp,
        };
        onUserChange(authedUser);
        setSuccessMsg(`Welcome, ${gUser.displayName || gUser.email}! 1-Tap Google Sign-In verified.`);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err?.message || 'Google 1-Tap sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendClick = async () => {
    if (!pendingAuth || resendCooldown > 0) return;
    setIsLoading(true);
    try {
      const res = await resendVerificationEmail({
        token: pendingAuth.token,
        email: pendingAuth.email,
      });
      setResendCooldown(30);
      setSuccessMsg('Fresh authorization link sent!');
      loadEmails(pendingAuth.email);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAuthorizeSimulated = async (token: string) => {
    setIsLoading(true);
    try {
      await verifyTokenDirectly(token);
      const res = await checkIpAuthorizationStatus(token);
      if (res.authorized && res.user) {
        setPendingAuth(null);
        setShowMailbox(false);
        onUserChange(res.user);
        setSuccessMsg('IP Address authorized! Session active.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeIpClick = async (ipToRevoke: string) => {
    if (!currentUser) return;
    if (!window.confirm(`Revoke authorization for IP address ${ipToRevoke}? Next time you sign in from this IP, you must re-verify via email.`)) {
      return;
    }

    try {
      const res = await revokeAuthorizedIp(currentUser.email, ipToRevoke);
      onUserChange({
        ...currentUser,
        authorizedIps: res.authorizedIps,
      });
      setSuccessMsg(`IP ${ipToRevoke} revoked.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke IP');
    }
  };

  const handleSignOut = () => {
    logoutDiscordUser();
    onUserChange(null);
    setPassword('');
    setPendingAuth(null);
    setSuccessMsg('Signed out of this device.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full flex items-start justify-center p-3 sm:p-6 py-4 sm:py-8">
        <div className="bg-[#111827] text-stone-100 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-800 my-auto animate-in fade-in zoom-in-95">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-display text-white">
                    Account Security
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                    Discord-Style IP Guard
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  Password protected & IP address authorization
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alert notifications */}
          {errorMsg && (
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-950/50 border border-rose-900 text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Security Alert</p>
                <p className="mt-0.5 text-rose-300">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          <div className="py-4">

            {/* CASE 1: PENDING IP AUTHORIZATION SCREEN (DISCORD STYLE) */}
            {pendingAuth ? (
              <div className="space-y-4 text-center py-2 animate-fadeIn">
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center rounded-3xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                  <ShieldAlert className="w-8 h-8 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    {pendingAuth.type === 'registration_verify'
                      ? 'Verify Your Account & Authorize IP'
                      : 'New Login Location / IP Detected'}
                  </h4>
                  <p className="text-xs text-stone-300 mt-1 max-w-sm mx-auto">
                    We sent an authorization email to{' '}
                    <strong className="text-indigo-300 font-mono">{pendingAuth.email}</strong>.
                    Click the link in your email to authorize this device.
                  </p>
                </div>

                {/* Detected IP Card */}
                <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 text-left space-y-2 max-w-md mx-auto">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">Device IP Address:</span>
                    <span className="font-mono text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800/80">
                      {pendingAuth.ip}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-400">Status:</span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                      Waiting for email authorization...
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 border-t border-stone-800/80 pt-2">
                    💡 This window automatically detects when you open the link in your email and logs you in instantly.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="pt-2 flex flex-col gap-2 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMailbox(true);
                      loadEmails(pendingAuth.email);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                  >
                    <Inbox className="w-4 h-4" />
                    <span>View Sent Email & Authorize in 1 Click</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResendClick}
                      disabled={resendCooldown > 0 || isLoading}
                      className="flex-1 py-2 px-3 rounded-xl border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Resend email (${resendCooldown}s)` : 'Resend Email'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPendingAuth(null)}
                      className="py-2 px-3 rounded-xl text-stone-400 hover:text-white text-xs transition cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            ) : !currentUser ? (

              /* CASE 2: SIGN IN / CREATE ACCOUNT FORM */
              <div className="space-y-4">
                {/* 1-Tap Google Sign-In Button */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleOneTapSignIn}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs transition border border-stone-200 shadow-sm flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>1-Tap Google Sign-In & Calendar Access</span>
                </button>

                <div className="relative flex py-0.5 items-center">
                  <div className="flex-grow border-t border-stone-800"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-stone-500 uppercase font-semibold">Or use email & password</span>
                  <div className="flex-grow border-t border-stone-800"></div>
                </div>

                {/* Tabs */}
                <div className="flex items-center p-1 rounded-2xl bg-stone-900 border border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setErrorMsg(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                      tab === 'login'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Sign In (Existing User)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('register');
                      setErrorMsg(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                      tab === 'register'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Google Credential Manager Unified Trigger & IP Indicator */}
                <div className="p-3 bg-stone-900/90 rounded-2xl border border-stone-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-stone-200">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>Google Credential Manager</span>
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800">
                      IP: {currentIp}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                    <p className="text-[11px] text-stone-400 flex-1">
                      {tab === 'login'
                        ? 'Google aggregates your saved passwords and passkeys seamlessly.'
                        : 'Google suggests strong passwords & prompts to save your credentials.'}
                    </p>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          requestAndroidCredentials();
                          requestSavedPasswordCredentials(false).then((cred) => {
                            if (cred?.id) {
                              setEmail(cred.id);
                              if (cred.password) setPassword(cred.password);
                            }
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 transition shadow-xs cursor-pointer"
                        title="Open Google Credential Manager"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Autofill</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Standard HTML Form for Google Password Manager & Browser Autofill */}
                <form
                  id={tab === 'register' ? 'register-form' : 'login-form'}
                  name={tab === 'register' ? 'registerForm' : 'loginForm'}
                  method="post"
                  action="#"
                  autoComplete="on"
                  onSubmit={tab === 'login' ? handleLoginSubmit : handleRegisterSubmit}
                  className="space-y-3 pt-1"
                >
                  {tab === 'register' && (
                    <div>
                      <label 
                        htmlFor="name"
                        className="block text-xs font-bold text-stone-300 mb-1"
                      >
                        Your Name / Display Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          data-autofill-hint="name"
                          placeholder="e.g. Alex"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-900 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label 
                      htmlFor="email"
                      className="block text-xs font-bold text-stone-300 mb-1"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="email"
                        name="username"
                        type="email"
                        required
                        autoComplete="username"
                        data-autofill-hint="username"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="you@example.com"
                        value={email}
                        onFocus={() => {
                          setIsEmailFocused(true);
                          setIsPasswordFocused(false);
                        }}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-900 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label 
                      htmlFor="password"
                      className="block text-xs font-bold text-stone-300 mb-1"
                    >
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                        data-autofill-hint="password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="••••••••"
                        value={password}
                        onFocus={() => {
                          setIsPasswordFocused(true);
                          setIsEmailFocused(false);
                        }}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-stone-700 bg-stone-900 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-indigo-500"
                      />
                      <div className="absolute right-2.5 top-2 flex items-center gap-1">
                        {tab === 'register' && (
                          <button
                            type="button"
                            onClick={handleQuickSuggestPassword}
                            className="p-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-stone-800 transition cursor-pointer"
                            title="Suggest & fill strong password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 cursor-pointer transition"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    name="submit"
                    value="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{tab === 'login' ? 'Sign In & Verify IP' : 'Create Account & Authorize IP'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Open Security Mailbox helper */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMailbox(true);
                      loadEmails(email);
                    }}
                    className="text-[11px] text-stone-400 hover:text-indigo-300 flex items-center justify-center gap-1 mx-auto transition cursor-pointer"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>View Sent Security Emails / Simulator</span>
                  </button>
                </div>
              </div>
            ) : (

              /* CASE 3: LOGGED IN USER PROFILE & IP MANAGEMENT */
              <div className="space-y-4">
                
                {/* User card */}
                <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white">
                          {currentUser.displayName || 'Authorized User'}
                        </h4>
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          IP Verified
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 font-mono mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Cloud Regimen Sync Card */}
                {onSyncRegimen && onRestoreRegimen && (
                  <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-200">Encrypted Cloud Storage</span>
                      <span className="text-stone-400 text-[11px]">{localSupplementsCount} supplements local</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onSyncRegimen();
                          setSuccessMsg('Regimens safely backed up to your encrypted account!');
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <CloudUpload className="w-3.5 h-3.5" />
                        <span>Back Up Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onRestoreRegimen();
                          setSuccessMsg('Latest cloud regimen loaded to device!');
                          setTimeout(() => setSuccessMsg(null), 3000);
                        }}
                        className="py-2 px-3 rounded-xl border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <CloudDownload className="w-3.5 h-3.5" />
                        <span>Restore Data</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Authorized IP Addresses List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Authorized IP Addresses ({currentUser.authorizedIps?.length || 1})</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMailbox(true);
                        loadEmails();
                      }}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Inbox className="w-3 h-3" />
                      <span>View Emails</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {currentUser.authorizedIps && currentUser.authorizedIps.length > 0 ? (
                      currentUser.authorizedIps.map((ip) => {
                        const isCurrent = ip === currentIp;
                        return (
                          <div
                            key={ip}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                              isCurrent
                                ? 'bg-indigo-950/30 border-indigo-700/80 text-white'
                                : 'bg-stone-900 border-stone-800 text-stone-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span className="font-mono font-bold">{ip}</span>
                              {isCurrent && (
                                <span className="px-2 py-0.2 rounded-md bg-indigo-900 text-indigo-200 text-[10px] font-bold">
                                  Current Device
                                </span>
                              )}
                            </div>

                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleRevokeIpClick(ip)}
                                title="Revoke this IP"
                                className="text-stone-400 hover:text-rose-400 p-1 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 bg-stone-900 rounded-xl text-xs text-stone-400">
                        Current IP: <span className="font-mono text-white">{currentIp}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* IN-APP SECURITY EMAIL VIEWER / SIMULATOR MODAL */}
          {showMailbox && (
            <div className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
              <div className="bg-[#1e293b] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-700 space-y-4 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-stone-700 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                      <Inbox className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Security Mailbox</h4>
                      <p className="text-[11px] text-stone-400">Sent verification emails & 1-click authorization</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMailbox(false)}
                    className="p-1 text-stone-400 hover:text-white rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {recentEmails.length === 0 ? (
                    <div className="text-center py-8 text-xs text-stone-400 space-y-2">
                      <Mail className="w-8 h-8 mx-auto text-stone-500 opacity-50" />
                      <p>No verification emails recorded yet for this session.</p>
                    </div>
                  ) : (
                    recentEmails.map((mail) => (
                      <div
                        key={mail.id}
                        className="p-4 rounded-2xl bg-stone-900/90 border border-stone-700/80 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{mail.subject}</span>
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(mail.sentAt).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-stone-950 text-xs space-y-1 font-mono text-stone-300">
                          <div>To: <span className="text-white">{mail.to}</span></div>
                          <div>Target IP: <span className="text-indigo-300 font-bold">{mail.ip}</span></div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleQuickAuthorizeSimulated(mail.token)}
                            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Authorize IP ({mail.ip}) Now</span>
                          </button>

                          <a
                            href={mail.verificationLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                            title="Open verification page in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-stone-700 flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMailbox(false)}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Floating Google Passkey & Autofill Strip (Directly Above the Keyboard - matches IMG20261002074054) */}
      {!currentUser && (isPasswordFocused || isEmailFocused) && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-60 bg-[#161418]/98 border-t border-stone-800 shadow-[0_-12px_35px_rgba(0,0,0,0.85)] px-3.5 pt-2.5 pb-3.5 animate-slideUp backdrop-blur-md"
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="max-w-md mx-auto">
            {/* Header prompt exactly as shown in photo */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-stone-400 font-medium tracking-tight">
                Before using this app, you can review
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsPasswordFocused(false);
                  setIsEmailFocused(false);
                }}
                className="text-stone-500 hover:text-stone-300 p-0.5 rounded-md cursor-pointer transition"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Horizontal scrollable passkey/credential cards */}
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-0.5">
              {/* Card 1: User's primary email / passkey (neelamtiwari81976@gmail.com) */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setEmail('neelamtiwari81976@gmail.com');
                  if (tab === 'register' && !password) {
                    setPassword(suggestedPassword || generateNewSuggestion());
                  }
                  setIsEmailFocused(false);
                  setSuccessMsg('neelamtiwari81976@gmail.com filled via Passkey!');
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                className="shrink-0 text-left px-4 py-2.5 rounded-2xl border border-stone-700/90 bg-stone-900/95 hover:border-indigo-400 active:scale-98 transition cursor-pointer min-w-[220px] max-w-[270px] shadow-sm"
              >
                <div className="text-[12.5px] font-semibold text-stone-100 truncate">
                  neelamtiwari81976@gmail.com
                </div>
                <div className="text-[11px] text-stone-400 font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold">Passkey</span>
                  <span className="text-stone-500">•</span>
                  <span>Google Account</span>
                </div>
              </button>

              {/* Card 2: Secondary Passkey Account (ompalshukla1@gmail.com) */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setEmail('ompalshukla1@gmail.com');
                  if (tab === 'register' && !password) {
                    setPassword(suggestedPassword || generateNewSuggestion());
                  }
                  setIsEmailFocused(false);
                  setSuccessMsg('ompalshukla1@gmail.com filled via Passkey!');
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                className="shrink-0 text-left px-4 py-2.5 rounded-2xl border border-stone-700/90 bg-stone-900/95 hover:border-indigo-400 active:scale-98 transition cursor-pointer min-w-[200px] max-w-[250px] shadow-sm"
              >
                <div className="text-[12.5px] font-semibold text-stone-100 truncate">
                  ompalshukla1@gmail.com
                </div>
                <div className="text-[11px] text-stone-400 font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold">Passkey</span>
                  <span className="text-stone-500">•</span>
                  <span>Google Account</span>
                </div>
              </button>

              {/* Card 3: Strong Password Suggestion */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleApplySuggestedPassword}
                className="shrink-0 text-left px-4 py-2.5 rounded-2xl border border-stone-700/90 bg-stone-900/95 hover:border-emerald-400 active:scale-98 transition cursor-pointer min-w-[200px] shadow-sm"
              >
                <div className="text-[12.5px] font-mono font-bold text-emerald-400 truncate tracking-wide">
                  {suggestedPassword}
                </div>
                <div className="text-[11px] text-stone-400 font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="text-amber-400 font-semibold">Suggested Password</span>
                  <span className="text-stone-500">•</span>
                  <span>Google Autofill</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
