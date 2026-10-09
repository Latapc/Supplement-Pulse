import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  lastLoginIp: string;
  authorizedIps: string[];
}

export interface PendingIpAuth {
  token: string;
  userId: string;
  email: string;
  ip: string;
  userAgent: string;
  type: 'registration_verify' | 'new_ip_login';
  createdAt: string;
  expiresAt: string;
  authorized: boolean;
}

export interface SecurityEmailLog {
  id: string;
  to: string;
  subject: string;
  type: 'registration_verify' | 'new_ip_login';
  ip: string;
  verificationLink: string;
  sentAt: string;
  contentSnippet: string;
  token: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_DB_FILE = path.join(DATA_DIR, 'users_auth_db.json');
const EMAILS_LOG_FILE = path.join(DATA_DIR, 'security_emails.json');

// Ensure storage directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not initialize data directory:', e);
}

// Memory caches
const usersMap = new Map<string, UserAccount>(); // key: lowercase email
const pendingTokensMap = new Map<string, PendingIpAuth>(); // key: token
const emailLogs: SecurityEmailLog[] = [];

// Initialize databases from disk
try {
  if (fs.existsSync(USERS_DB_FILE)) {
    const raw = fs.readFileSync(USERS_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    Object.values(parsed).forEach((u: any) => usersMap.set(u.email.toLowerCase(), u));
  }
} catch (err) {
  console.warn('Could not read users_auth_db.json:', err);
}

try {
  if (fs.existsSync(EMAILS_LOG_FILE)) {
    const raw = fs.readFileSync(EMAILS_LOG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      emailLogs.push(...parsed.slice(-50));
    }
  }
} catch (err) {
  console.warn('Could not read security_emails.json:', err);
}

function persistUsersDb() {
  try {
    const dir = path.dirname(USERS_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj: Record<string, UserAccount> = {};
    usersMap.forEach((u, k) => {
      obj[k] = u;
    });
    fs.writeFileSync(USERS_DB_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist users_auth_db.json:', err);
  }
}

function persistEmailLogs() {
  try {
    const dir = path.dirname(EMAILS_LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(EMAILS_LOG_FILE, JSON.stringify(emailLogs.slice(-50), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist security_emails.json:', err);
  }
}

// Password hashing
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Helper to extract true client IP
export function getClientIp(req: express.Request): string {
  // req.ip respects Express's explicitly configured trust-proxy policy.
  // Never trust a caller-supplied X-Forwarded-For header directly.
  const remote = req.ip || req.socket.remoteAddress || '127.0.0.1';
  if (remote === '::1' || remote === '::ffff:127.0.0.1') return '127.0.0.1';
  return remote.startsWith('::ffff:') ? remote.slice(7) : remote;
}

// Nodemailer transporter (uses SMTP if environment variables exist)
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

// Send Discord-Style Security Email
async function sendSecurityEmail(params: {
  to: string;
  type: 'registration_verify' | 'new_ip_login';
  ip: string;
  token: string;
  userAgent: string;
  baseUrl: string;
}) {
  const { to, type, ip, token, userAgent, baseUrl } = params;
  const verificationLink = `${baseUrl}/verify-ip?token=${token}`;
  
  const isNewAccount = type === 'registration_verify';
  const subject = isNewAccount
    ? '🛡️ Verify your email & authorize IP for Supple Pulse'
    : '🛡️ New login location detected for Supple Pulse';

  const dateStr = new Date().toUTCString();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .logo-badge { background-color: #059669; color: white; width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
    .brand-title { font-size: 20px; font-weight: bold; color: #f8fafc; }
    h2 { font-size: 18px; margin-top: 0; color: #ffffff; }
    p { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .alert-box { background-color: #0f172a; border: 1px solid #3b82f6; border-radius: 14px; padding: 16px; margin: 20px 0; }
    .alert-item { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .alert-label { color: #94a3b8; }
    .alert-value { color: #38bdf8; font-family: monospace; font-weight: bold; }
    .btn { display: inline-block; background-color: #5865f2; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 15px; margin: 16px 0; text-align: center; box-shadow: 0 4px 12px rgba(88,101,242,0.3); }
    .footer { font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      <span class="logo-badge">💊</span>
      <span class="brand-title">Supple Pulse Security</span>
    </div>

    <h2>${isNewAccount ? 'Verify Email & Authorize IP' : 'New Login Location Detected'}</h2>
    
    <p>
      ${isNewAccount 
        ? `Thank you for creating an account on Supple Pulse. To complete your setup and ensure secure access, please authorize your current IP address below:`
        : `Someone is attempting to sign in to your Supple Pulse account from an unrecognized IP address. If this was you, please authorize this IP address to proceed:`}
    </p>

    <div class="alert-box">
      <div class="alert-item">
        <span class="alert-label">IP Address:</span>
        <span class="alert-value">${ip}</span>
      </div>
      <div class="alert-item">
        <span class="alert-label">Date & Time:</span>
        <span class="alert-value">${dateStr}</span>
      </div>
      <div class="alert-item">
        <span class="alert-label">Account:</span>
        <span class="alert-value">${to}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${verificationLink}" class="btn">
        Authorize IP Address (${ip})
      </a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
      Or copy and open this authorization URL in your browser:<br/>
      <a href="${verificationLink}" style="color: #38bdf8; word-break: break-all;">${verificationLink}</a>
    </p>

    <div class="footer">
      <p>This verification link will expire in 15 minutes. If you did not attempt this login, we recommend changing your password immediately.</p>
    </div>
  </div>
</body>
</html>
  `;

  // Log in memory and file for the in-app security drawer & simulated testing
  const emailLog: SecurityEmailLog = {
    id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    to,
    subject,
    type,
    ip,
    verificationLink,
    sentAt: new Date().toISOString(),
    contentSnippet: `IP ${ip} authorization link sent`,
    token,
  };
  emailLogs.unshift(emailLog);
  persistEmailLogs();

  // If real SMTP is configured, send actual outbound email
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Supple Pulse Security" <no-reply@supplepulse.app>',
        to,
        subject,
        html,
      });
      console.log(`[Security Email] Outbound SMTP sent successfully to ${to}`);
    } catch (err) {
      console.error(`[Security Email] SMTP delivery failed for ${to}:`, err);
    }
  } else {
    console.log(`[Security Email] Logged in security mailbox: ${to} -> ${verificationLink}`);
  }

  return emailLog;
}

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;
const authAttemptBuckets = new Map<string, { count: number; resetAt: number }>();

function authRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const key = getClientIp(req);
  let bucket = authAttemptBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + AUTH_WINDOW_MS };
    authAttemptBuckets.set(key, bucket);
  }
  bucket.count += 1;

  // Opportunistically prune expired entries so this map remains bounded over time.
  if (authAttemptBuckets.size > 5000) {
    for (const [ip, item] of authAttemptBuckets) {
      if (item.resetAt <= now) authAttemptBuckets.delete(ip);
    }
  }

  if (bucket.count > AUTH_MAX_ATTEMPTS) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many authentication attempts. Please wait before trying again.' });
  }
  next();
}

export function createDiscordAuthRouter(): express.Router {
  const router = express.Router();

  // Helper to get base URL for links
  function getBaseUrl(req: express.Request): string {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${protocol}://${host}`;
  }

  // 1. POST /api/auth/register
  router.post('/register', authRateLimit, async (req, res) => {
    try {
      const { email, password, displayName } = req.body ?? {};
      if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      if (password.length < 8 || password.length > 1024) {
        return res.status(400).json({ error: 'Password must be between 8 and 1024 characters.' });
      }
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (usersMap.has(normalizedEmail)) {
        return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
      }

      const clientIp = getClientIp(req);
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt, PASSWORD_ITERATIONS);
      const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;

      const newUser: UserAccount = {
        id: userId,
        email: normalizedEmail,
        passwordHash,
        salt,
        passwordIterations: PASSWORD_ITERATIONS,
        displayName: typeof displayName === 'string' ? displayName.trim().slice(0, 80) || normalizedEmail.split('@')[0] : normalizedEmail.split('@')[0],
        isEmailVerified: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: '',
        lastLoginIp: '',
        authorizedIps: [],
      };

      usersMap.set(normalizedEmail, newUser);
      persistUsersDb();

      // Create IP authorization token
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
      
      const pendingAuth: PendingIpAuth = {
        token,
        userId,
        email: normalizedEmail,
        ip: clientIp,
        userAgent: req.get('user-agent') || 'Unknown device',
        type: 'registration_verify',
        createdAt: new Date().toISOString(),
        expiresAt,
        authorized: false,
      };

      pendingTokensMap.set(token, pendingAuth);

      // Send the verification link only to the registered email address.
      const baseUrl = getBaseUrl(req);
      await sendSecurityEmail({
        to: normalizedEmail,
        type: 'registration_verify',
        ip: clientIp,
        token,
        userAgent: req.get('user-agent') || 'Unknown',
        baseUrl,
      });

      return res.json({
        success: true,
        authorized: false,
        requiresIpVerification: true,
        type: 'registration_verify',
        email: normalizedEmail,
        ip: clientIp,
        token,
        message: 'Account created. Check your email to verify the address and authorize this device.',
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  // 2. POST /api/auth/login
  router.post('/login', authRateLimit, async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 1024) {
        return res.status(400).json({ error: 'Email and password must be valid text values.' });
      }
      const normalizedEmail = email.trim().toLowerCase();
      const user = usersMap.get(normalizedEmail);

      if (!user) {
        // Perform a dummy derivation to reduce timing differences for unknown accounts.
        hashPassword(password, crypto.randomBytes(16).toString('hex'), PASSWORD_ITERATIONS);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Existing accounts without metadata retain their legacy iteration count until
      // a successful login, when the stored hash is upgraded.
      const iterations = Number.isInteger(user.passwordIterations) ? user.passwordIterations! : 1000;
      const calculatedHash = hashPassword(password, user.salt, iterations);
      if (!hashesMatch(calculatedHash, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (iterations < PASSWORD_ITERATIONS) {
        user.passwordHash = hashPassword(password, user.salt, PASSWORD_ITERATIONS);
        user.passwordIterations = PASSWORD_ITERATIONS;
      }

      const clientIp = getClientIp(req);

      // Discord-style check: Is this IP already in user's authorized list?
      const isIpAuthorized = user.isEmailVerified && user.authorizedIps.includes(clientIp);

      if (isIpAuthorized) {
        // Known & Authorized IP: Immediate successful login!
        user.lastLoginAt = new Date().toISOString();
        user.lastLoginIp = clientIp;
        persistUsersDb();

        persistUsersDb();
        const sessionToken = createSession(user.id);
        return res.json({
          success: true,
          authorized: true,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            authorizedIps: user.authorizedIps,
            currentIp: clientIp,
          },
          token: sessionToken,
          message: 'Login successful!',
        });
      }

      // NEW / UNRECOGNIZED IP (or unverified account): Require Discord-style IP authorization!
      const token = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const pendingAuth: PendingIpAuth = {
        token,
        userId: user.id,
        email: normalizedEmail,
        ip: clientIp,
        userAgent: req.get('user-agent') || 'Unknown device',
        type: user.isEmailVerified ? 'new_ip_login' : 'registration_verify',
        createdAt: new Date().toISOString(),
        expiresAt,
        authorized: false,
      };

      pendingTokensMap.set(token, pendingAuth);

      const baseUrl = getBaseUrl(req);
      await sendSecurityEmail({
        to: normalizedEmail,
        type: pendingAuth.type,
        ip: clientIp,
        token,
        userAgent: req.get('user-agent') || 'Unknown',
        baseUrl,
      });

      return res.json({
        success: true,
        authorized: false,
        requiresIpVerification: true,
        type: pendingAuth.type,
        email: normalizedEmail,
        ip: clientIp,
        token,
        message: 'New location detected. Check your email to authorize this device.',
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // 3. GET /api/auth/check-ip-status?token=...
  // Polled by the login screen waiting for user to click verification email
  router.get('/check-ip-status', (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const pending = pendingTokensMap.get(token);
    if (!pending) {
      return res.status(404).json({ error: 'Authorization request not found or expired' });
    }

    if (new Date() > new Date(pending.expiresAt)) {
      pendingTokensMap.delete(token);
      return res.status(410).json({ error: 'Verification token has expired. Please try signing in again.' });
    }

    if (pending.authorized) {
      const user = usersMap.get(pending.email.toLowerCase());
      if (user) {
        return res.json({
          authorized: true,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            authorizedIps: user.authorizedIps,
            currentIp: pending.ip,
          },
          token: createSession(user.id),
          message: 'IP successfully authorized!',
        });
      }
    }

    return res.json({
      authorized: false,
      ip: pending.ip,
      email: pending.email,
      expiresAt: pending.expiresAt,
    });
  });

  // Programmatic verification is intentionally disabled. A client-held pending
  // token must not be enough to bypass the email confirmation page.
  router.post('/verify-ip-token', (_req, res) => {
    return res.status(410).json({
      error: 'Verification must be completed through the confirmation page sent to your email.',
    });
  });

  // Revoke the current bearer session when a user signs out.
  router.post('/logout', (req, res) => {
    const authorization = req.get('authorization') || '';
    const match = /^Bearer\\s+([A-Za-z0-9_-]{40,})$/.exec(authorization);
    if (match) sessionsMap.delete(match[1]);
    return res.json({ success: true });
  });

  // 5. POST /api/auth/resend-verification
  router.post('/resend-verification', authRateLimit, async (req, res) => {
    const { token } = req.body ?? {};
    if (typeof token !== 'string' || token.length > 128) {
      return res.status(400).json({ error: 'A valid verification request is required.' });
    }
    const pending = pendingTokensMap.get(token);

    if (!pending || pending.authorized || new Date() > new Date(pending.expiresAt)) {
      return res.status(404).json({ error: 'No active pending authorization found to resend.' });
    }

    // Refresh expiry
    pending.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const baseUrl = getBaseUrl(req);
    const emailLog = await sendSecurityEmail({
      to: pending.email,
      type: pending.type,
      ip: pending.ip,
      token: pending.token,
      userAgent: req.get('user-agent') || 'Unknown',
      baseUrl,
    });

    return res.json({
      success: true,
      message: 'A new authorization email has been sent if the request is still active.',
    });
  });

  // 6. GET /api/auth/recent-emails (Interactive Security Mailbox for quick access)
  router.get('/recent-emails', (req, res) => {
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser) return res.status(401).json({ error: 'Authentication required.' });

    // Never expose verification tokens or links via the security mailbox API.
    const filtered = emailLogs
      .filter((entry) => entry.to.toLowerCase() === currentUser.email.toLowerCase())
      .slice(0, 10)
      .map(({ token: _token, verificationLink: _link, ip: _ip, ...safeEntry }) => safeEntry);

    return res.json({ success: true, emails: filtered });
  });

  // 7. POST /api/auth/revoke-ip
  router.post('/revoke-ip', (req, res) => {
    const currentUser = getAuthenticatedUser(req);
    if (!currentUser) return res.status(401).json({ error: 'Authentication required.' });

    const { ipToRevoke } = req.body ?? {};
    if (typeof ipToRevoke !== 'string' || !ipToRevoke || ipToRevoke.length > 64) {
      return res.status(400).json({ error: 'A valid IP address is required.' });
    }

    currentUser.authorizedIps = currentUser.authorizedIps.filter((ip) => ip !== ipToRevoke);
    persistUsersDb();

    return res.json({
      success: true,
      authorizedIps: currentUser.authorizedIps,
      message: 'Device authorization revoked.',
    });
  });

  // 8. GET /api/auth/client-ip
  router.get('/client-ip', (req, res) => {
    const clientIp = getClientIp(req);
    return res.json({ ip: clientIp });
  });

  // 9. POST /api/auth/save-credentials-hook
  // Responds to native form POSTs targeting the hidden iframe so browsers / Google Password Manager prompt to save credentials
  router.post('/save-credentials-hook', (req, res) => {
    return res.status(200).send('OK');
  });

  return router;
}

// Dedicated HTML page handler for /verify-ip?token=...
export function handleVerifyIpHtml(req: express.Request, res: express.Response) {
  const token = req.method === 'POST' ? req.body?.token : req.query.token;

  if (typeof token !== 'string' || !/^[a-f0-9]{48}$/.test(token)) {
    return res.status(400).send(renderVerifyResultHtml({
      success: false,
      title: 'Missing Authorization Token',
      message: 'No authorization token was provided in the link.',
    }));
  }

  const pending = pendingTokensMap.get(token);
  if (!pending) {
    return res.status(404).send(renderVerifyResultHtml({
      success: false,
      title: 'Invalid or Expired Link',
      message: 'This IP authorization link has already been used or has expired. Please sign in again on your device to receive a fresh authorization email.',
    }));
  }

  if (new Date() > new Date(pending.expiresAt)) {
    pendingTokensMap.delete(token);
    return res.status(410).send(renderVerifyResultHtml({
      success: false,
      title: 'Link Expired',
      message: 'This authorization link expired after 15 minutes. Please return to Supple Pulse and request a new one.',
    }));
  }

  const user = usersMap.get(pending.email.toLowerCase());
  if (!user) {
    return res.status(404).send(renderVerifyResultHtml({
      success: false,
      title: 'Account Not Found',
      message: 'The account associated with this authorization request was not found.',
    }));
  }

  // A GET must only display a confirmation page. Email security scanners often
  // prefetch links; requiring an explicit POST avoids authorizing a device on preview.
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.send(renderVerifyConfirmationHtml(token));
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  // Authorize the IP only after the user confirms the POST form.
  user.isEmailVerified = true;
  if (!user.authorizedIps.includes(pending.ip)) {
    user.authorizedIps.push(pending.ip);
  }
  user.lastLoginAt = new Date().toISOString();
  user.lastLoginIp = pending.ip;
  persistUsersDb();

  pending.authorized = true;

  return res.send(renderVerifyResultHtml({
    success: true,
    title: 'IP Address Authorized!',
    ip: pending.ip,
    email: user.email,
    message: `IP address ${pending.ip} has been successfully authorized for ${user.email}. Your app session will now automatically unlock.`,
  }));
}

function renderVerifyConfirmationHtml(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Confirm Device Authorization - Supple Pulse</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#090d16;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif}
    main{max-width:440px;width:100%;padding:32px;border:1px solid #334155;border-radius:20px;background:#111827;text-align:center}
    p{color:#cbd5e1;line-height:1.6}
    button{border:0;border-radius:12px;background:#059669;color:white;padding:13px 22px;font-weight:700;font-size:15px;cursor:pointer}
  </style>
</head>
<body>
  <main>
    <h1>Confirm this device</h1>
    <p>Only continue if you requested this sign-in or account verification. Confirming will verify your email address and authorize the device that started the request.</p>
    <form method="post" action="/verify-ip">
      <input type="hidden" name="token" value="${token}">
      <button type="submit">Confirm and authorize device</button>
    </form>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderVerifyResultHtml(opts: {
  success: boolean;
  title: string;
  message: string;
  ip?: string;
  email?: string;
}): string {
  const { success, title, message, ip, email } = opts;
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeIp = ip ? escapeHtml(ip) : '';
  const safeEmail = email ? escapeHtml(email) : '';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} - Supple Pulse</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #111827;
      border: 1px solid ${success ? '#059669' : '#dc2626'};
      border-radius: 24px;
      padding: 36px 28px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: ${success ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)'};
      color: ${success ? '#10b981' : '#ef4444'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 12px;
      color: #ffffff;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .badge {
      display: inline-block;
      background: #1e293b;
      padding: 8px 16px;
      border-radius: 12px;
      font-family: monospace;
      font-size: 13px;
      color: #38bdf8;
      margin-bottom: 20px;
      border: 1px solid #334155;
    }
    .btn {
      display: inline-block;
      background: #059669;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 14px;
      font-weight: bold;
      font-size: 14px;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #047857;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '🛡️' : '⚠️'}</div>
    <h1>${safeTitle}</h1>
    ${ip ? `<div class="badge">Authorized IP: ${safeIp}</div>` : ''}
    <p>${safeMessage}</p>
    <a href="/" class="btn">Return to Supple Pulse</a>
  </div>
</body>
</html>
  `;
}
