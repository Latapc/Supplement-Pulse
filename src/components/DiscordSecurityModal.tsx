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
  requestSavedPasswordCredentials,
  promptSaveCredentialsToManager,
  getApiUrl
} from '../utils/discordAuthClient';

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

  // Fetch client IP on open & register conditional mediation for Password Managers
  useEffect(() => {
    if (isOpen) {
      getClientIp().then(setCurrentIp);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Trigger conditional mediation so Google Password Manager / Autofill
      // attaches to the username/password fields immediately
      requestSavedPasswordCredentials(true).then((cred) => {
        if (cred && cred.id) {
          setEmail(cred.id);
          if (cred.password) setPassword(cred.password);
        }
      });
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

  // Trigger Google Password Manager / OS Autofill bottom sheet when tapping fields
  const handleTriggerAutofill = async () => {
    if (!email && !password) {
      const cred = await requestSavedPasswordCredentials(false);
      if (cred && cred.id) {
        setEmail(cred.id);
        if (cred.password) setPassword(cred.password);
      }
    }
  };

  if (!isOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    // If fields are incomplete, stop submission
    if (!email.trim() || !password) {
      e.preventDefault();
      setErrorMsg('Email and password are required');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    const targetEmail = email.trim();
    const targetPassword = password;
    const targetName = displayName.trim() || undefined;

    // Prompt Google / OS Password Manager to save credentials via W3C API
    promptSaveCredentialsToManager({
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

      if (res.requiresIpVerification) {
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
    // If fields are incomplete, stop submission
    if (!email.trim() || !password) {
      e.preventDefault();
      setErrorMsg('Email and password are required');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    const targetEmail = email.trim();
    const targetPassword = password;

    // Prompt Google / OS Password Manager to save credentials via W3C API
    promptSaveCredentialsToManager({
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

                {/* Password Manager Hint */}
                <div className="p-3 bg-stone-900/80 rounded-2xl border border-stone-800 text-xs text-stone-300 space-y-1.5">
                  <div className="flex items-center justify-between text-stone-200 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Password Manager & IP Guard</span>
                    </span>
                    <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-900">
                      IP: {currentIp}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Tap the email or password field to choose saved credentials. When you press Enter or sign in, your browser or password manager will prompt to save your login.
                  </p>
                </div>

                {/* Hidden iframe for seamless Google Password Manager & Browser form capture */}
                <iframe
                  name="auth-credential-frame"
                  id="auth-credential-frame"
                  title="Credential Receiver"
                  className="hidden"
                  style={{ display: 'none', width: 0, height: 0, border: 0 }}
                  tabIndex={-1}
                  aria-hidden="true"
                />

                {/* Standard HTML Form for Google Password Manager & Browser Autofill */}
                <form
                  id={tab === 'login' ? 'login-form' : 'register-form'}
                  name={tab === 'login' ? 'loginForm' : 'registerForm'}
                  method="post"
                  action={getApiUrl('/api/auth/save-credentials-hook')}
                  target="auth-credential-frame"
                  autoComplete="on"
                  onSubmit={tab === 'login' ? handleLoginSubmit : handleRegisterSubmit}
                  className="space-y-3 pt-1"
                >
                  {tab === 'register' && (
                    <div>
                      <label 
                        htmlFor="register-displayname"
                        className="block text-xs font-bold text-stone-300 mb-1"
                      >
                        Your Name / Display Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
                        <input
                          id="register-displayname"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="e.g. Alex"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-900 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label 
                        htmlFor="auth-email-input"
                        className="block text-xs font-bold text-stone-300"
                      >
                        Email Address
                      </label>
                      <button
                        type="button"
                        onClick={handleTriggerAutofill}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Autofill</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="auth-email-input"
                        name="username"
                        type="email"
                        required
                        autoComplete="username email"
                        inputMode="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="you@example.com"
                        value={email}
                        onFocus={handleTriggerAutofill}
                        onClick={handleTriggerAutofill}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-700 bg-stone-900 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label 
                      htmlFor="auth-password-input"
                      className="block text-xs font-bold text-stone-300 mb-1"
                    >
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="auth-password-input"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                        spellCheck={false}
                        placeholder="••••••••"
                        value={password}
                        onFocus={handleTriggerAutofill}
                        onClick={handleTriggerAutofill}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-700 bg-stone-900 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-stone-500 hover:text-stone-300 cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
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
    </div>
  );
};
