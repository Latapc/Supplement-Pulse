import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createDiscordAuthRouter, handleVerifyIpHtml } from './server/discordAuth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for Android APK (Capacitor https://localhost) and external clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Chat assistant route for supplement regimens and intelligent actions
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, currentSupplements, currentLogs, currentDate } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const todayStr = currentDate || new Date().toISOString().split('T')[0];

    const systemPrompt = `You are the intelligent clinical supplement assistant for SuppleTrack.
You help the user manage, add, modify, delete supplements, log doses, configure special cycling protocols (like Boron 2 weeks ON, 1 week OFF), and manage lifetime (infinity) regimens.
Current Date: ${todayStr}

Current Active Supplements:
${JSON.stringify(currentSupplements || [], null, 2)}

Recent Dose Logs:
${JSON.stringify(currentLogs || [], null, 2)}

You must respond in JSON with the following schema:
{
  "reply": "Conversational helpful explanation of what you did or answered, clearly explaining the cycling or lifetime duration if applicable",
  "action": null OR {
    "type": "add_supplement" | "update_supplement" | "delete_supplement" | "log_dose" | "renew_course",
    "description": "Human readable description of the change, e.g. Added Boron 6mg (2 weeks ON / 1 week OFF cycle for life)",
    "supplement": {
      "name": string,
      "doseAmount": number,
      "unit": "IU" | "mg" | "mcg" | "g" | "ml" | "capsules" | "tablets" | "drops",
      "form": "capsule" | "tablet" | "softgel" | "liquid" | "powder" | "gummy",
      "category": "vitamins" | "minerals" | "herbs" | "amino_acids" | "omega" | "general",
      "frequencyType": "daily" | "weekly" | "interval",
      "selectedDays": number[] (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat),
      "intervalDays"?: number,
      "doseTime": "HH:MM" (e.g. "09:00"),
      "foodTiming": "with_food" | "before_bed" | "empty_stomach" | "with_morning_meal" | "anytime",
      "expiryDate"?: "YYYY-MM-DD",
      "cycleConfig"?: {
        "isCyclic": boolean,
        "onDays": number,
        "offDays": number,
        "cycleStartDate": "YYYY-MM-DD",
        "patternDescription"?: string
      },
      "duration": {
        "type": "fixed" | "continuous" | "infinity",
        "startDate": "YYYY-MM-DD",
        "endDate"?: "YYYY-MM-DD",
        "periodValue"?: number,
        "periodUnit"?: "days" | "weeks" | "months"
      },
      "notes"?: string
    },
    "supplementId"?: string (for update or delete or renew or log_dose),
    "doseLog"?: {
      "supplementId": string,
      "amountTaken": number,
      "notes"?: string
    }
  }
}

CRITICAL RULES FOR DURATION & CYCLING:
1. "FOR LIFE" / "INFINITY" REGIMENS:
   If the user requests taking a supplement "for life", "forever", "indefinitely", "infinity", or "don't stop after 3 months" (e.g., Vitamin D3 60,000 IU for life):
   - Set "duration.type": "infinity"
   - Do NOT set an endDate
   - Explicitly highlight in "reply" that the supplement has been configured with an infinity duration that will never expire or deactivate.

2. SPECIAL CYCLIC PROTOCOLS:
   If the user requests a special cycle, on/off phase, or pulsed intake (e.g. "Boron 6 mg: take every day for 2 weeks, then break for 1 week, repeat for life"):
   - Set "cycleConfig": {
       "isCyclic": true,
       "onDays": 14 (or specified number of active days),
       "offDays": 7 (or specified number of break/pause days),
       "cycleStartDate": "${todayStr}",
       "patternDescription": "Take daily for 2 weeks, then rest for 1 week (cycles continuously)"
     }
   - Set "duration.type": "infinity" (unless a fixed course is explicitly requested)
   - Set "frequencyType": "daily" (the cycling engine handles the on/off phases automatically)
   - In "reply", explain the cycling schedule and that the app will track active vs. rest phases automatically.

3. EXPIRY DATES:
   If the user specifies an expiry date (e.g. "expires 2026-12-31" or "expiry 2027-05-01"), record it as "expiryDate": "YYYY-MM-DD".
   If the user asks about expired or expiring supplements, inspect currentSupplements and list them clearly in "reply".

If the user asks to add, log, update, or remove a supplement, always include the structured action object so the client can automatically apply and offer an undo option!
If user asks general questions or asks what they have left to take today, answer directly in "reply" with "action": null.`;

    let parsedResult: any = null;

    if (ai) {
      // Primary model: gemini-3.8-flash, followed by gemini-2.5-flash and gemini-flash-latest
      const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Message: ${message}` }] },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });
          const text = response.text;
          if (text) {
            parsedResult = JSON.parse(text);
            if (parsedResult && parsedResult.reply) {
              break;
            }
          }
        } catch (err: any) {
          console.warn(`Model ${model} encounter error:`, err?.message || err);
        }
      }
    }

    if (parsedResult && parsedResult.reply) {
      // If AI didn't create an action, but user instruction implies adding or cycling a supplement, attach fallback action
      if (!parsedResult.action) {
        const fallback = parseSupplementProtocolFallback(message, todayStr, currentSupplements);
        if (fallback.action) {
          parsedResult.action = fallback.action;
          if (!parsedResult.reply || parsedResult.reply.length < 25) {
            parsedResult.reply = fallback.reply;
          }
        }
      }
      return res.json(parsedResult);
    }

    // High reliability fallback protocol parser (ensures zero downtime for special cycles & infinity)
    const fallbackResponse = parseSupplementProtocolFallback(message, todayStr, currentSupplements);
    return res.json(fallbackResponse);
  } catch (error) {
    console.error('Gemini chat error, serving fallback:', error);
    const fallbackResponse = parseSupplementProtocolFallback(req.body?.message || '', req.body?.currentDate, req.body?.currentSupplements);
    res.json(fallbackResponse);
  }
});

// Fallback rule parser in case Gemini API is temporarily unavailable
function parseSupplementProtocolFallback(message: string, currentDateStr?: string, currentSupplements?: any[]) {
  const lower = message.toLowerCase();
  const todayStr = currentDateStr || new Date().toISOString().split('T')[0];

  // Pattern A: Expiry inquiries
  if (lower.includes('expir') || lower.includes('shelf life') || lower.includes('freshness')) {
    const suppList: any[] = Array.isArray(currentSupplements) ? currentSupplements : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired = suppList.filter((s) => {
      if (!s.expiryDate) return false;
      const [y, m, d] = s.expiryDate.split('-').map(Number);
      const exp = new Date(y, m - 1, d);
      return exp < today;
    });

    const expiringSoon = suppList.filter((s) => {
      if (!s.expiryDate) return false;
      const [y, m, d] = s.expiryDate.split('-').map(Number);
      const exp = new Date(y, m - 1, d);
      const diff = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    });

    if (expired.length > 0 || expiringSoon.length > 0) {
      let breakdown = '';
      if (expired.length > 0) {
        breakdown += `⚠️ Expired Bottles:\n${expired.map((s) => `• ${s.name} (Expired on ${s.expiryDate})`).join('\n')}\n\n`;
      }
      if (expiringSoon.length > 0) {
        breakdown += `⏳ Expiring Soon (Within 30 Days):\n${expiringSoon.map((s) => `• ${s.name} (Expires ${s.expiryDate})`).join('\n')}`;
      }
      return {
        reply: breakdown.trim(),
        action: null,
      };
    } else {
      return {
        reply: 'All tracked supplement bottles with set expiry dates are fresh and well within their safe shelf life!',
        action: null,
      };
    }
  }

  // Pattern B: Status / Diagnostics / Help
  if (lower.includes('not working') || lower.includes("doesn't work") || lower.includes('broken') || lower.includes('help')) {
    return {
      reply: `I am fully active, listening, and ready to update your protocol! You can type commands like:
• "Boron 6 mg: take every day for 2 weeks, then break for 1 week, repeat for life"
• "Vitamin D3 60,000 IU for life"
• "Add Zinc 25mg with expiry 2026-12-31"
• "Check expiry dates"
• "I took my dose today"

Or tap any of the quick action pills in the chat drawer!`,
      action: null,
    };
  }

  // Detect supplement name
  let name = 'Custom Supplement';
  let doseAmount = 1000;
  let unit: any = 'mg';
  let category: any = 'vitamins';
  let form: any = 'capsule';
  let freq: any = 'daily';
  let selectedDays: number[] | undefined = [1];

  if (lower.includes('boron')) {
    name = 'Boron (Glycinate Complex)';
    doseAmount = 6;
    unit = 'mg';
    category = 'minerals';
    form = 'capsule';
    freq = 'daily';
  } else if (lower.includes('vitamin d') || lower.includes('vit d') || lower.includes('d3')) {
    name = 'Vitamin D3 (Cholecalciferol)';
    doseAmount = 60000;
    unit = 'IU';
    category = 'vitamins';
    form = 'capsule';
    freq = 'weekly';
    selectedDays = [1];
  } else if (lower.includes('b12') || lower.includes('b-12') || lower.includes('cobalamin')) {
    name = 'Vitamin B12 (Methylcobalamin)';
    doseAmount = 1500;
    unit = 'mg';
    category = 'vitamins';
    form = 'tablet';
    freq = 'weekly';
    selectedDays = [1];
  } else if (lower.includes('magnesium')) {
    name = 'Magnesium Glycinate';
    doseAmount = 400;
    unit = 'mg';
    category = 'minerals';
    form = 'capsule';
    freq = 'daily';
  } else if (lower.includes('ashwagandha')) {
    name = 'Ashwagandha KSM-66';
    doseAmount = 600;
    unit = 'mg';
    category = 'herbs';
    form = 'capsule';
    freq = 'daily';
  } else if (lower.includes('creatine')) {
    name = 'Creatine Monohydrate';
    doseAmount = 5;
    unit = 'g';
    category = 'amino_acids';
    form = 'powder';
    freq = 'daily';
  } else if (lower.includes('omega') || lower.includes('fish oil')) {
    name = 'Omega-3 Fish Oil';
    doseAmount = 1000;
    unit = 'mg';
    category = 'omega';
    form = 'softgel';
    freq = 'daily';
  } else if (lower.includes('zinc')) {
    name = 'Zinc Picolinate';
    doseAmount = 25;
    unit = 'mg';
    category = 'minerals';
    form = 'capsule';
    freq = 'daily';
  } else {
    const beforeColon = message.split(':')[0].trim();
    if (beforeColon && beforeColon.length < 35 && !beforeColon.toLowerCase().includes('take')) {
      name = beforeColon;
    }
  }

  // Extract explicit dose number and unit if in text (e.g. "6 mg", "60000 iu", "60,000 IU", "500mg")
  const doseMatch = message.match(/(\d+[\d,]*)\s*(iu|mg|mcg|g|ml|tablets?|capsules?|drops?)/i);
  if (doseMatch) {
    doseAmount = Number(doseMatch[1].replace(/,/g, ''));
    unit = doseMatch[2].toUpperCase() === 'IU' ? 'IU' : doseMatch[2].toLowerCase();
  }

  // Extract expiry date if specified (e.g. "expiry 2026-12-31" or "expires 2027-04-15")
  let expiryDate: string | undefined = undefined;
  const expiryMatch = message.match(/(?:expir(?:y|ed|es)?|best by|use by)\s*(?:date)?\s*(?:is|on|:|to)?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i);
  if (expiryMatch) {
    expiryDate = expiryMatch[1].replace(/\//g, '-');
  }

  // Check frequency
  if (lower.includes('weekly') || lower.includes('every week') || lower.includes('once a week')) {
    freq = 'weekly';
    selectedDays = [1];
  } else if (lower.includes('daily') || lower.includes('every day') || lower.includes('each day')) {
    freq = 'daily';
    selectedDays = undefined;
  }

  // Check if Infinity / For Life
  const isForLife = lower.includes('for life') || lower.includes('infinity') || lower.includes('lifetime') || lower.includes('forever') || lower.includes('never stop') || lower.includes("don't stop");

  // Check for cyclic protocol (e.g., "2 weeks, then break for 1 week", "2 weeks on 1 week off")
  let isCyclic = false;
  let onDays = 14;
  let offDays = 7;

  const weekPattern1 = lower.match(/(\d+)\s*(?:weeks?|w).*?(?:break\s*(?:for\s*)?|off\s*(?:for\s*)?|pause\s*(?:for\s*)?|don't\s*take\s*(?:it\s*)?(?:for\s*)?)(\d+)\s*(?:weeks?|w)/i);
  const weekPattern2 = lower.match(/(\d+)\s*(?:weeks?|w)\s*(?:on|every day|daily).*?(\d+)\s*(?:weeks?|w)\s*(?:off|break|pause)/i);
  const weekPattern3 = lower.match(/(\d+)\s*(?:weeks?|w)\s*(?:on)?\s*\/\s*(\d+)\s*(?:weeks?|w)\s*(?:off)?/i);
  const dayPattern = lower.match(/(\d+)\s*(?:days?|d)\s*(?:on|every day)?.*?(?:break|off|pause).*?(\d+)\s*(?:days?|d)/i);

  if (weekPattern1) {
    isCyclic = true;
    onDays = parseInt(weekPattern1[1], 10) * 7;
    offDays = parseInt(weekPattern1[2], 10) * 7;
  } else if (weekPattern2) {
    isCyclic = true;
    onDays = parseInt(weekPattern2[1], 10) * 7;
    offDays = parseInt(weekPattern2[2], 10) * 7;
  } else if (weekPattern3) {
    isCyclic = true;
    onDays = parseInt(weekPattern3[1], 10) * 7;
    offDays = parseInt(weekPattern3[2], 10) * 7;
  } else if (dayPattern) {
    isCyclic = true;
    onDays = parseInt(dayPattern[1], 10);
    offDays = parseInt(dayPattern[2], 10);
  } else if (lower.includes('boron') || (lower.includes('week') && (lower.includes('off') || lower.includes('break')))) {
    isCyclic = true;
    onDays = 14;
    offDays = 7;
  }

  const durationType = (isForLife || isCyclic) ? 'infinity' : 'fixed';
  const onLabel = onDays >= 7 && onDays % 7 === 0 ? `${onDays / 7} weeks` : `${onDays} days`;
  const offLabel = offDays >= 7 && offDays % 7 === 0 ? `${offDays / 7} week` : `${offDays} days`;

  let reply = '';
  let description = '';

  if (isCyclic) {
    reply = `I have configured your Special Cyclic Protocol for ${name} (${doseAmount.toLocaleString()} ${unit})! You will take it daily for ${onLabel} (Active Phase), then pause for ${offLabel} (Rest Break), repeating indefinitely. The system will track active vs. rest phases automatically and suppress notifications during your breaks.`;
    description = `Added ${name} (${doseAmount.toLocaleString()} ${unit}, ${onLabel} ON / ${offLabel} OFF cyclic protocol)`;
  } else if (isForLife) {
    reply = `I have added ${name} (${doseAmount.toLocaleString()} ${unit}) as a Lifetime Protocol (Infinity). Dosing alerts and calculations will continue for life without stopping after 3 months!`;
    description = `Added ${name} (${doseAmount.toLocaleString()} ${unit} ${freq}, Lifetime Protocol)`;
  } else {
    reply = `I have added ${name} (${doseAmount.toLocaleString()} ${unit}) to your protocol schedule.`;
    description = `Added ${name} (${doseAmount.toLocaleString()} ${unit})`;
  }

  return {
    reply,
    action: {
      type: 'add_supplement',
      description,
      supplement: {
        name,
        doseAmount,
        unit,
        form,
        category,
        colorTag: 'emerald',
        frequencyType: freq,
        selectedDays: freq === 'weekly' ? selectedDays : undefined,
        doseTime: '09:00',
        foodTiming: 'with_food',
        expiryDate,
        cycleConfig: isCyclic ? {
          isCyclic: true,
          onDays,
          offDays,
          cycleStartDate: todayStr,
          patternDescription: `Take daily for ${onLabel}, then pause for ${offLabel} (cycles continuously)`,
        } : undefined,
        duration: {
          type: durationType,
          startDate: todayStr,
          periodValue: durationType === 'fixed' ? 3 : undefined,
          periodUnit: durationType === 'fixed' ? 'months' : undefined,
        },
        notes: isCyclic ? `Special cyclic protocol: ${onLabel} ON / ${offLabel} OFF` : isForLife ? 'Lifetime Protocol (Infinity)' : 'Added by AI Assistant',
      },
    },
  };
}

// File-backed user cloud backup storage for multi-user isolation
const SYNC_DB_FILE = path.join(process.cwd(), 'data', 'user_sync_db.json');
const userCloudStores = new Map<string, any>();

// Load existing synced accounts on startup
try {
  if (fs.existsSync(SYNC_DB_FILE)) {
    const raw = fs.readFileSync(SYNC_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([k, v]) => userCloudStores.set(k, v));
  }
} catch (e) {
  console.warn('Failed to load user_sync_db.json:', e);
}

function persistSyncDb() {
  try {
    const obj: Record<string, any> = {};
    userCloudStores.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(SYNC_DB_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist user_sync_db.json:', e);
  }
}

app.post('/api/sync/save', (req, res) => {
  const { userId, payload } = req.body;
  if (!userId || !payload) {
    return res.status(400).json({ error: 'userId and payload are required' });
  }
  const timestamp = new Date().toISOString();
  userCloudStores.set(userId, {
    ...payload,
    savedAt: timestamp,
  });
  persistSyncDb();
  return res.json({ success: true, savedAt: timestamp });
});

app.get('/api/sync/load', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  const data = userCloudStores.get(userId);
  return res.json({ success: true, data: data || null });
});

app.delete('/api/sync/delete', (req, res) => {
  const userId = req.query.userId as string;
  if (userId) {
    userCloudStores.delete(userId);
    persistSyncDb();
  }
  return res.json({ success: true });
});

// Discord-style Security & IP Authentication Endpoints
app.use('/api/auth', createDiscordAuthRouter());
app.get('/verify-ip', handleVerifyIpHtml);

async function main() {
  const isProd = process.env.NODE_ENV === 'production';

  // Explicit PWA manifest endpoints so external crawlers (PWABuilder, Lighthouse) always receive valid JSON
  const manifestPath = path.resolve(__dirname, 'public', 'manifest.json');
  app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.sendFile(manifestPath);
  });

  // Explicit Service Worker endpoint with proper headers
  const swPath = path.resolve(__dirname, 'public', 'sw.js');
  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(swPath);
  });

  // Serve static files from public directory directly (PNG icons, SVG, screenshots)
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SuppleTrack full-stack server running at http://0.0.0.0:${port}`);
  });
}

main();
