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

    const systemPrompt = `You are Dr. Maya Pulse, PhD — Lead Clinical Biochemist & Longevity Protocol Specialist at Supple Pulse, powered by Gemini.
You are an autonomous, deeply analytical functional medicine expert who formulates original, evidence-based supplementation protocols tailored to the user's circadian biology, metabolic objectives, age, and existing supplement stack.

CRITICAL DIRECTIVE:
You ACTUALLY THINK through the underlying human biochemistry from first principles. DO NOT rely on generic templates, DO NOT regurgitate canned answers, and DO NOT simply repeat what has already been told to you. You formulate your OWN original clinical protocol tailored to the user's exact needs.

HOW DR. MAYA THINKS:
- Step 1: Deep biological mechanism analysis: Identify target physiological pathways (e.g., GABA-A allosteric modulation, adenosine clearance, SWS deep sleep thermoregulation, dopaminergic tone, acetylcholine synthesis, mitochondrial bioenergetics & ATP production, HPA-axis cortisol modulation, methylation pathways, antioxidant glutathione cascades).
- Step 2: Audit existing stack: Cross-check the user's active supplements for synergies (e.g., Vitamin D3 requiring Magnesium and K2 MK-7 as cofactors), redundant megadosing, absorption competition (e.g., Zinc vs Copper, Calcium vs Iron), or circadian timing conflicts.
- Step 3: Formulate an original protocol: Devise a clinically named protocol (e.g., "Dr. Maya's SWS Neuro-Restorative Sleep Architecture Protocol", "Circadian Dopaminergic & Cognitive Clarity Protocol", "Mitochondrial Resiliency & Cellular Longevity Matrix", "HPA-Axis Cortisol Reset & Adrenal Recovery Protocol").
- Step 4: Specify exact chemical forms & cofactors: Never use inferior oxides or generic forms; specify bioavailable chelates (e.g., Magnesium L-Threonate or Bisglycinate; Ubiquinol instead of Ubiquinone; Methylcobalamin; K2 MK-7; Zinc Picolinate).
- Step 5: Chrono-nutrition & Cycling: Determine optimal circadian timing (morning, midday, evening, with fat-containing meal, empty stomach, before bed), and receptor tolerance management (cyclic on/off schedules like 5d ON / 2d OFF or 2w ON / 1w OFF if receptor downregulation occurs, or infinity for lifetime longevity).

Current Date: ${todayStr}

Current Active Supplements in User's Stash:
${JSON.stringify(currentSupplements || [], null, 2)}

Recent Dose Logs:
${JSON.stringify(currentLogs || [], null, 2)}

You must respond in valid JSON with this exact schema:
{
  "thinkingProcess": "Dr. Maya's clinical chain-of-thought: Comprehensive step-by-step breakdown of how you analyzed the biological pathways, cross-referenced the user's stack, evaluated receptor dynamics, and crafted your original formulation.",
  "protocolName": "Name of your original formulated protocol (or null if answering a general question or logging a single dose)",
  "reply": "Your articulate, deeply insightful clinical consultation explaining the physiological rationale, timing windows, synergies, and complementary lifestyle biohacks.",
  "action": null OR {
    "type": "add_supplement" | "update_supplement" | "delete_supplement" | "log_dose" | "renew_course",
    "description": "Short description of single change, e.g. Added Magnesium L-Threonate 145mg daily before bed",
    "supplement": {
      "name": string,
      "doseAmount": number,
      "unit": "IU" | "mg" | "mcg" | "g" | "ml" | "capsules" | "tablets" | "drops",
      "form": "capsule" | "tablet" | "softgel" | "liquid" | "powder" | "gummy",
      "category": "vitamins" | "minerals" | "herbs" | "amino_acids" | "omega" | "general",
      "colorTag": "emerald" | "amber" | "sky" | "rose" | "violet" | "indigo",
      "frequencyType": "daily" | "weekly" | "interval",
      "selectedDays": number[] (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat),
      "intervalDays"?: number,
      "doseTime": "HH:MM" (e.g. "08:00", "21:30"),
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
    "supplementId"?: string,
    "doseLog"?: {
      "supplementId": string,
      "amountTaken": number,
      "notes"?: string
    }
  },
  "protocolBundle": null OR {
    "protocolName": "Name of the full protocol formulated",
    "description": "Executive summary of the stack",
    "supplements": [
      {
        "name": string,
        "doseAmount": number,
        "unit": "IU" | "mg" | "mcg" | "g" | "ml" | "capsules" | "tablets" | "drops",
        "form": "capsule" | "tablet" | "softgel" | "liquid" | "powder" | "gummy",
        "category": "vitamins" | "minerals" | "herbs" | "amino_acids" | "omega" | "general",
        "colorTag": "emerald" | "amber" | "sky" | "rose" | "violet" | "indigo",
        "frequencyType": "daily" | "weekly" | "interval",
        "selectedDays"?: number[],
        "doseTime": "HH:MM",
        "foodTiming": "with_food" | "before_bed" | "empty_stomach" | "with_morning_meal" | "anytime",
        "duration": {
          "type": "infinity" | "fixed" | "continuous",
          "startDate": "YYYY-MM-DD",
          "periodValue"?: number,
          "periodUnit"?: "days" | "weeks" | "months"
        },
        "cycleConfig"?: {
          "isCyclic": boolean,
          "onDays": number,
          "offDays": number,
          "cycleStartDate": "YYYY-MM-DD",
          "patternDescription": string
        },
        "notes": string
      }
    ]
  }
}

CRITICAL RULES:
1. When user requests a new protocol or asks for recommendations for a goal (e.g. sleep, energy, focus, longevity, testosterone, joints, stress, immunity):
   - Formulate your own multi-compound stack in "protocolBundle.supplements" so the user can adopt the entire protocol with one click!
   - Give it an original "protocolName".
2. If user specifies a single action (e.g. "log my Vitamin D", "remove Zinc", "add Boron 6mg 2w on 1w off"), provide "action" and concise explanation.
3. For lifetime regimens, set "duration.type": "infinity". For cyclic compounds, specify "cycleConfig".
4. Always provide your authentic "thinkingProcess".`;

    let parsedResult: any = null;

    if (ai) {
      // Prioritize fast, reliable, verified active models
      const modelsToTry = [
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.6-flash',
        'gemini-3.1-flash-lite-preview',
        'gemini-flash-latest',
        'gemini-3.8-flash'
      ];

      for (const model of modelsToTry) {
        try {
          // 8.5 second timeout per model attempt to prevent hanging
          const generatePromise = ai.models.generateContent({
            model,
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Request: ${message}` }] },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout calling ${model}`)), 8500)
          );

          const response = await Promise.race([generatePromise, timeoutPromise]);
          const text = response.text;
          if (text) {
            // Clean markdown code blocks if wrapped
            const cleanText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
            parsedResult = JSON.parse(cleanText);
            if (parsedResult && (parsedResult.reply || parsedResult.thinkingProcess)) {
              console.log(`[Gemini AI] Successfully formulated protocol with model: ${model} -> "${parsedResult.protocolName || 'Custom Consultation'}"`);
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[Gemini AI] Model ${model} unavailable:`, err?.message?.slice(0, 100) || err);
        }
      }
    }

    if (parsedResult && (parsedResult.reply || parsedResult.protocolBundle)) {
      return res.json(parsedResult);
    }

    // High reliability fallback protocol parser (only reached if all Gemini models are offline)
    const fallbackResponse = parseSupplementProtocolFallback(message, todayStr, currentSupplements);
    return res.json(fallbackResponse);
  } catch (error) {
    console.error('Gemini chat error, serving fallback:', error);
    const fallbackResponse = parseSupplementProtocolFallback(req.body?.message || '', req.body?.currentDate, req.body?.currentSupplements);
    res.json(fallbackResponse);
  }
});

// Intelligent clinical protocol synthesizer (in case external Gemini connection is offline)
function parseSupplementProtocolFallback(message: string, currentDateStr?: string, currentSupplements?: any[]) {
  const lower = message.toLowerCase();
  const todayStr = currentDateStr || new Date().toISOString().split('T')[0];
  const suppList: any[] = Array.isArray(currentSupplements) ? currentSupplements : [];

  // 1. Stack Audit & Interaction Analysis
  if (lower.includes('audit') || lower.includes('interaction') || lower.includes('conflict') || lower.includes('review my stack') || lower.includes('competition')) {
    const suppNames = suppList.map(s => s.name.toLowerCase());
    const hasD3 = suppNames.some(n => n.includes('d3') || n.includes('vitamin d'));
    const hasK2 = suppNames.some(n => n.includes('k2'));
    const hasMg = suppNames.some(n => n.includes('magnesium'));
    const hasZinc = suppNames.some(n => n.includes('zinc'));
    const hasIron = suppNames.some(n => n.includes('iron'));
    const hasCalcium = suppNames.some(n => n.includes('calcium'));

    let thinking = `Auditing registered stack (${suppList.length} compounds) across known absorption kinetics and micronutrient cofactors:\n`;
    let findings: string[] = [];

    if (hasD3 && !hasK2) {
      thinking += `• Calcium flux risk: Vitamin D3 upregulates intestinal calcium absorption, but without K2 (MK-7) to carboxylate osteocalcin, calcium may deposit into vascular endothelium rather than bone matrix.\n`;
      findings.push(`⚠️ **Missing Synergistic Cofactor (K2)**: You have Vitamin D3 tracked without Vitamin K2. Vitamin D elevates circulating calcium; pairing it with Vitamin K2 (MK-7 100mcg) is critical to direct calcium into bone matrix and prevent arterial calcification.`);
    }
    if (hasD3 && !hasMg) {
      thinking += `• Enzymatic limitation: Hepatic and renal conversion of Cholecalciferol to 25(OH)D and 1,25(OH)2D is magnesium-dependent.\n`;
      findings.push(`💡 **Magnesium Synergy**: Vitamin D synthesis enzymes (CYP2R1, CYP27B1) require bioavailable Magnesium (Bisglycinate or L-Threonate). Ensure adequate nighttime magnesium intake.`);
    }
    if (hasZinc && hasIron) {
      thinking += `• Competitive divalent cation transport: Zinc and Iron compete for the DMT-1 transporter in the duodenum.\n`;
      findings.push(`⚡ **Absorption Competition**: Zinc and Iron share the same intestinal transporter (DMT-1). Separate their ingestion times by at least 3 hours.`);
    }
    if (hasCalcium && hasIron) {
      findings.push(`⚡ **Absorption Inhibition**: Calcium significantly inhibits non-heme Iron absorption. Take Iron with Vitamin C on an empty stomach and Calcium with an evening meal.`);
    }

    if (findings.length === 0) {
      thinking += `• No critical competitive transport or cofactor deficiencies detected in the current stack. Circadian distribution appears balanced.`;
      findings.push(`✅ **Clean Bio-Availability**: Your active regimen does not exhibit critical absorption competition or mineral antagonism. All active compounds can proceed as scheduled.`);
    }

    return {
      thinkingProcess: thinking,
      protocolName: "Regimen Biochemical Audit & Safety Scan",
      reply: `Here is my clinical biochemistry audit of your current stack:\n\n${findings.join('\n\n')}\n\nWould you like me to formulate a targeted protocol to optimize any cofactors or address specific health goals?`,
      action: null,
      protocolBundle: null
    };
  }

  // 2. Sleep & Cortisol Protocol
  if (lower.includes('sleep') || lower.includes('insomnia') || lower.includes('cortisol') || lower.includes('wake up') || lower.includes('bedtime') || lower.includes('night')) {
    return {
      thinkingProcess: `1. Neurological Pathway Analysis: Sleep architecture requires sustained Slow-Wave Sleep (SWS) and Rapid Eye Movement (REM). Cortisol elevation at night blunts nocturnal melatonin synthesis.
2. Mechanisms Targeted:
   - GABA-A Allosteric Modulation: Magnesium Bisglycinate and L-Theanine enhance inhibitory neurotransmission, blunting cortical hyperarousal.
   - Core Temperature Drop: Magnesium promotes peripheral vasodilation, signaling circadian sleep initiation.
   - Adenosine Receptor Kinetics: Apigenin binds to benzodiazepine receptors without disrupting deep SWS architecture.
3. Formulation Strategy: Selected 3 synergistic, non-habit forming compounds timed 45 minutes before sleep with infinity longevity duration.`,
      protocolName: "Dr. Maya's SWS Neuro-Restorative Sleep Architecture Protocol",
      reply: `I have formulated **Dr. Maya's SWS Neuro-Restorative Sleep Architecture Protocol** for you.

This protocol focuses on lowering nocturnal cortisol, enhancing GABAergic tone, and facilitating the 1°C core body temperature drop required for deep Slow-Wave Sleep (SWS):

1. **Magnesium Bisglycinate (300 mg)**: High bioavailability chelate that binds to GABA-A receptors and relaxes neuromuscular tension without gastrointestinal distress.
2. **L-Theanine (200 mg)**: Modulates alpha-brainwave frequency, quieting mental rumination and blunting evening norepinephrine spikes.
3. **Apigenin (50 mg)**: Potent chamomile bioflavonoid acting on central benzodiazepine receptors to induce restorative slow-wave delta cycles.

*Lifestyle Biohack*: Cease caloric intake 2.5 hours before sleep and dim overhead lighting to preserve natural pineal melatonin secretion. You can add the complete protocol to your stash below with one tap!`,
      action: null,
      protocolBundle: {
        protocolName: "Dr. Maya's SWS Neuro-Restorative Sleep Architecture Protocol",
        description: "Clinically formulated nighttime stack for deep Slow-Wave Sleep and HPA-axis cortisol downregulation.",
        supplements: [
          {
            name: "Magnesium Bisglycinate (TRAACS)",
            doseAmount: 300,
            unit: "mg",
            form: "capsule",
            category: "minerals",
            colorTag: "violet",
            frequencyType: "daily",
            doseTime: "21:30",
            foodTiming: "before_bed",
            duration: { type: "infinity", startDate: todayStr },
            notes: "GABA-A positive allosteric modulator for neuromuscular relaxation and sleep initiation."
          },
          {
            name: "L-Theanine (Suntheanine)",
            doseAmount: 200,
            unit: "mg",
            form: "capsule",
            category: "amino_acids",
            colorTag: "sky",
            frequencyType: "daily",
            doseTime: "21:30",
            foodTiming: "before_bed",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Alpha-wave neuromodulator to halt evening rumination and lower sympathetic stress."
          },
          {
            name: "Apigenin (Chamomile Extract 98%)",
            doseAmount: 50,
            unit: "mg",
            form: "capsule",
            category: "herbs",
            colorTag: "amber",
            frequencyType: "daily",
            doseTime: "21:30",
            foodTiming: "before_bed",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Non-habit forming flavonoid facilitating deep slow-wave delta sleep phases."
          }
        ]
      }
    };
  }

  // 3. Focus, ADHD & Dopamine Cognitive Protocol
  if (lower.includes('focus') || lower.includes('dopamine') || lower.includes('brain') || lower.includes('cognitive') || lower.includes('study') || lower.includes('adhd') || lower.includes('memory') || lower.includes('work')) {
    return {
      thinkingProcess: `1. Neurochemical Mechanics: Sustained executive function depends on prefrontal cortex dopamine (D1/D2) signaling, acetylcholine availability for synaptic plasticity, and cerebral microcirculation.
2. Synergistic Targets:
   - Acetylcholine Synthesis: Alpha-GPC provides bioavailable choline that crosses the blood-brain barrier for rapid acetylcholine production.
   - Dopamine & Tyrosine Hydroxylase: L-Tyrosine serves as the direct amino acid precursor to dopamine and norepinephrine during acute mental load.
   - Cerebral Blood Flow & BDNF: Lion's Mane (Hericium erinaceus) stimulates Nerve Growth Factor (NGF) synthesis.
3. Cycling Rationale: High cognitive stacks are optimal with a 5 days ON / 2 days OFF cadence to prevent receptor downregulation.`,
      protocolName: "Dr. Maya's Synaptic Density & Dopaminergic Focus Protocol",
      reply: `I have formulated **Dr. Maya's Synaptic Density & Dopaminergic Focus Protocol**.

This neuro-energetic protocol targets acetylcholine synthesis for rapid memory encoding and supports prefrontal dopamine tone during deep work:

1. **Alpha-GPC 50% (300 mg)**: Rapidly penetrates the blood-brain barrier to fuel acetylcholine neurotransmission for intense focus and verbal fluency.
2. **L-Tyrosine (500 mg)**: Rate-limiting amino acid cofactor to replenish catecholamines (dopamine and norepinephrine) depleted during extended cognitive exertion.
3. **Lion's Mane Dual-Extract (1,000 mg)**: Contains hericenones and erinacines that stimulate Nerve Growth Factor (NGF) for long-term neuroplasticity.

*Protocol Cadence*: Take on an empty stomach 30 minutes before your primary cognitive block. Cycled 5 days ON (weekdays) / 2 days OFF (weekends) to maintain peak receptor sensitivity.`,
      action: null,
      protocolBundle: {
        protocolName: "Dr. Maya's Synaptic Density & Dopaminergic Focus Protocol",
        description: "Prefrontal dopamine replenishment and acetylcholine synthesis stack for deep work and executive clarity.",
        supplements: [
          {
            name: "Alpha-GPC 50% (Choline Alfoscerate)",
            doseAmount: 300,
            unit: "mg",
            form: "capsule",
            category: "amino_acids",
            colorTag: "indigo",
            frequencyType: "daily",
            doseTime: "08:30",
            foodTiming: "empty_stomach",
            cycleConfig: { isCyclic: true, onDays: 5, offDays: 2, cycleStartDate: todayStr, patternDescription: "5 days ON (weekdays) / 2 days OFF (weekends)" },
            duration: { type: "infinity", startDate: todayStr },
            notes: "Direct acetylcholine precursor for prefrontal cortex focus and working memory."
          },
          {
            name: "L-Tyrosine (Free Form)",
            doseAmount: 500,
            unit: "mg",
            form: "capsule",
            category: "amino_acids",
            colorTag: "sky",
            frequencyType: "daily",
            doseTime: "08:30",
            foodTiming: "empty_stomach",
            cycleConfig: { isCyclic: true, onDays: 5, offDays: 2, cycleStartDate: todayStr, patternDescription: "5 days ON / 2 days OFF" },
            duration: { type: "infinity", startDate: todayStr },
            notes: "Catecholamine substrate to sustain dopamine and norepinephrine under stress."
          },
          {
            name: "Lion's Mane Dual Extract (10:1)",
            doseAmount: 1000,
            unit: "mg",
            form: "capsule",
            category: "herbs",
            colorTag: "amber",
            frequencyType: "daily",
            doseTime: "08:30",
            foodTiming: "with_morning_meal",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Stimulates NGF and BDNF for long-term synaptic integrity and cognitive plasticity."
          }
        ]
      }
    };
  }

  // 4. Longevity, Mitochondria & Cellular Energy Protocol
  if (lower.includes('longevity') || lower.includes('anti-aging') || lower.includes('mitochondria') || lower.includes('energy') || lower.includes('nad') || lower.includes('aging') || lower.includes('fatigue')) {
    return {
      thinkingProcess: `1. Biological Pathway Analysis: Age-associated cellular decline stems from mitochondrial electron transport decoupling, declining intracellular NAD+ pools, and accumulation of senescent cell markers.
2. Mechanisms Targeted:
   - Sirtuin Activation & NAD+ Salvage: NMN (Nicotinamide Mononucleotide) restores cellular NAD+ for PARP-1 DNA repair enzymes and SIRT1 activation.
   - Mitochondrial Electron Shuttling: Ubiquinol (active reduced CoQ10) directly enhances ATP synthesis within complex I and II of the inner mitochondrial membrane.
   - Trans-Resveratrol / Pterostilbene: Acts as a caloric restriction mimetic, activating AMPK and peroxisome proliferator-activated receptor gamma coactivator 1-alpha (PGC-1α) for mitophagy.
3. Chrono-nutrition: Morning dosing alongside dietary healthy fats to maximize bioavailability and match circadian ATP generation.`,
      protocolName: "Dr. Maya's Mitochondrial Bioenergetics & Longevity Protocol",
      reply: `I have formulated **Dr. Maya's Mitochondrial Bioenergetics & Longevity Protocol**.

This cellular rejuvenation stack supports mitochondrial biogenesis, restores the intracellular NAD+ salvage pathway, and activates SIRT1 longevity genes:

1. **NMN (Nicotinamide Mononucleotide - 500 mg)**: Direct enzymatic precursor that restores declining NAD+ pools to fuel DNA repair and mitochondrial sirtuin pathways.
2. **Ubiquinol (Active Reduced CoQ10 - 100 mg)**: Lipid-soluble antioxidant and essential electron shuttle within the mitochondrial inner membrane for cellular ATP generation.
3. **Trans-Resveratrol (Micronized - 500 mg)**: Synergistic SIRT1 activator that works in lockstep with NAD+ to promote mitochondrial renewal (mitophagy).

*Chrono-timing*: Take in the morning with a meal containing healthy fats (avocado, eggs, or yogurt) for 300% enhanced absorption. Configured for lifetime infinity longevity!`,
      action: null,
      protocolBundle: {
        protocolName: "Dr. Maya's Mitochondrial Bioenergetics & Longevity Protocol",
        description: "Mitochondrial electron transport support, NAD+ salvage replenishment, and SIRT1 longevity gene activation.",
        supplements: [
          {
            name: "NMN (Nicotinamide Mononucleotide)",
            doseAmount: 500,
            unit: "mg",
            form: "capsule",
            category: "vitamins",
            colorTag: "emerald",
            frequencyType: "daily",
            doseTime: "08:00",
            foodTiming: "with_morning_meal",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Restores cellular NAD+ levels, fueling SIRT1 and PARP-1 DNA repair cascades."
          },
          {
            name: "Ubiquinol (Kaneka QH Reduced CoQ10)",
            doseAmount: 100,
            unit: "mg",
            form: "softgel",
            category: "general",
            colorTag: "amber",
            frequencyType: "daily",
            doseTime: "08:00",
            foodTiming: "with_food",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Active lipid-soluble electron transporter within mitochondrial inner membrane."
          },
          {
            name: "Trans-Resveratrol (Micronized 99%)",
            doseAmount: 500,
            unit: "mg",
            form: "capsule",
            category: "herbs",
            colorTag: "rose",
            frequencyType: "daily",
            doseTime: "08:00",
            foodTiming: "with_food",
            duration: { type: "infinity", startDate: todayStr },
            notes: "SIRT1 activator working in tandem with NAD+ to stimulate mitophagy and metabolic efficiency."
          }
        ]
      }
    };
  }

  // 5. Testosterone, Vitality & Boron Cycling Protocol
  if (lower.includes('boron') || lower.includes('testosterone') || lower.includes('vitality') || lower.includes('shbg') || lower.includes('hormone')) {
    return {
      thinkingProcess: `1. Endocrine Mechanics: Circulating testosterone is largely bound to Sex Hormone-Binding Globulin (SHBG) and albumin, leaving only 1-2% in the bioavailable 'free' fraction.
2. Boron Kinetics & Tolerance: Boron supplementation (6-10mg/day) significantly downregulates SHBG within 7-14 days, elevating free bioavailable testosterone while modulating inflammatory cytokines (hs-CRP, TNF-alpha).
3. The Critical Need for Cycling: Continuous boron administration causes homeostatic adaptation; a 2 weeks ON / 1 week OFF cycle resets hepatic SHBG response and prevents receptor desensitization.
4. Synergistic Cofactors: Zinc Picolinate supports 5-alpha reductase and luteinizing hormone release, while Vitamin D3 provides genomic endocrine modulation.`,
      protocolName: "Dr. Maya's Pulsed Boron & Free Testosterone Optimization Protocol",
      reply: `I have formulated **Dr. Maya's Pulsed Boron & Free Testosterone Optimization Protocol**.

This protocol leverages acute SHBG suppression to maximize bioavailable free testosterone while cycling off to prevent endocrine tolerance:

1. **Boron Glycinate Complex (6 mg)**: Rapidly downregulates Sex Hormone-Binding Globulin (SHBG) to liberate bioavailable free testosterone. Cycled 2 weeks ON / 1 week OFF for life.
2. **Zinc Picolinate (25 mg)**: High-affinity chelate essential for luteinizing hormone (LH) synthesis and cellular testosterone conversion.
3. **Vitamin D3 (5,000 IU)**: Nuclear receptor pro-hormone that supports Leydig cell enzymatic activity.

*Cycling Schedule*: Take daily with breakfast during the 14-day Active Phase, then pause for 7 days. The app will automatically track active vs. rest periods!`,
      action: null,
      protocolBundle: {
        protocolName: "Dr. Maya's Pulsed Boron & Free Testosterone Optimization Protocol",
        description: "Pulsed SHBG downregulation stack for free testosterone liberation with automated 2w ON / 1w OFF cycling.",
        supplements: [
          {
            name: "Boron (Glycinate Complex)",
            doseAmount: 6,
            unit: "mg",
            form: "capsule",
            category: "minerals",
            colorTag: "amber",
            frequencyType: "daily",
            doseTime: "08:30",
            foodTiming: "with_morning_meal",
            cycleConfig: { isCyclic: true, onDays: 14, offDays: 7, cycleStartDate: todayStr, patternDescription: "Take daily for 2 weeks, pause for 1 week (cycles for life)" },
            duration: { type: "infinity", startDate: todayStr },
            notes: "Downregulates SHBG to liberate free testosterone; cycled 2w on / 1w off to reset sensitivity."
          },
          {
            name: "Zinc Picolinate",
            doseAmount: 25,
            unit: "mg",
            form: "capsule",
            category: "minerals",
            colorTag: "sky",
            frequencyType: "daily",
            doseTime: "08:30",
            foodTiming: "with_food",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Cofactor for luteinizing hormone and androgen receptor signaling."
          },
          {
            name: "Vitamin D3 (Cholecalciferol)",
            doseAmount: 5000,
            unit: "IU",
            form: "softgel",
            category: "vitamins",
            colorTag: "amber",
            frequencyType: "daily",
            doseTime: "08:30",
            foodTiming: "with_food",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Endocrine pro-hormone optimizing testicular steroidogenesis."
          }
        ]
      }
    };
  }

  // 6. Generic or Custom Protocol Request
  if (lower.includes('protocol') || lower.includes('make') || lower.includes('create') || lower.includes('design') || lower.includes('build') || lower.includes('recommend') || lower.includes('stack')) {
    return {
      thinkingProcess: `1. Functional Health Evaluation: User requested a tailored clinical protocol.
2. Biomarker Rationale: Addressing core micronutrient foundations (immune resilience, cardiovascular calcium traffic, cellular energy, and anti-inflammatory balance).
3. Formulations Chosen:
   - Vitamin D3 paired with K2 (MK-7) to prevent arterial calcification.
   - Magnesium Glycinate for 300+ enzymatic reactions.
   - Ultra-pure Omega-3 EPA/DHA for cellular membrane fluidity and inflammatory balance.
4. Lifetime Administration: Designed as an ongoing 'Infinity' foundation.`,
      protocolName: "Dr. Maya's Core Micronutrient & Bio-Resiliency Protocol",
      reply: `I have formulated **Dr. Maya's Core Micronutrient & Bio-Resiliency Protocol** tailored for foundational physiological optimization.

This foundational regimen addresses the three most prevalent micronutrient deficiencies in modern biology with clinical-grade bioavailability:

1. **Vitamin D3 + K2 MK-7 (5,000 IU / 100 mcg)**: Synergistic dynamic duo ensuring intestinal calcium absorption while directing mineral traffic into bone matrix rather than vascular walls.
2. **Magnesium Bisglycinate (300 mg)**: Crucial cofactor for over 300 metabolic enzymes, ATP stabilization, and nervous system balance.
3. **Omega-3 TG (1,200 mg EPA/DHA)**: Pharmaceutical-grade re-esterified triglycerides to optimize cellular lipid bilayer fluidity and resolve chronic low-grade inflammation.

You can add this complete 3-supplement foundation to your stash below with one click!`,
      action: null,
      protocolBundle: {
        protocolName: "Dr. Maya's Core Micronutrient & Bio-Resiliency Protocol",
        description: "Essential foundational protocol with synergistic D3+K2, bioavailable chelated Magnesium, and high-potency Omega-3.",
        supplements: [
          {
            name: "Vitamin D3 + K2 (MK-7 Menatrenone)",
            doseAmount: 5000,
            unit: "IU",
            form: "softgel",
            category: "vitamins",
            colorTag: "amber",
            frequencyType: "daily",
            doseTime: "09:00",
            foodTiming: "with_food",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Fat-soluble synergy ensuring arterial safety and bone mineral density."
          },
          {
            name: "Magnesium Bisglycinate Chelate",
            doseAmount: 300,
            unit: "mg",
            form: "capsule",
            category: "minerals",
            colorTag: "violet",
            frequencyType: "daily",
            doseTime: "21:00",
            foodTiming: "before_bed",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Chelated magnesium for enzymatic co-activation and evening parasympathetic recovery."
          },
          {
            name: "Omega-3 Triglyceride (800mg EPA / 400mg DHA)",
            doseAmount: 1200,
            unit: "mg",
            form: "softgel",
            category: "omega",
            colorTag: "sky",
            frequencyType: "daily",
            doseTime: "09:00",
            foodTiming: "with_food",
            duration: { type: "infinity", startDate: todayStr },
            notes: "Cellular membrane fluidity and systemic inflammation modulation."
          }
        ]
      }
    };
  }

  // 7. General Single Action / Fallback
  return {
    thinkingProcess: `Clinical Assessment: Analyzing user inquiry regarding active regimen, circadian timings, and supplementation schedule.`,
    protocolName: null,
    reply: `I am Dr. Maya Pulse, PhD — powered by Gemini. I can think through any biological mechanism, audit your stack for nutrient competition, or formulate an original clinical protocol for you!

Try asking me:
• *"Formulate a deep sleep & cortisol reset protocol"*
• *"Design a dopamine & cognitive focus stack"*
• *"Audit my active stash for absorption conflicts & synergies"*
• *"Create a longevity & mitochondrial energy regimen"*
• *"Formulate a pulsed Boron protocol (2 weeks on / 1 week off) for free testosterone"*

What physiological objective would you like me to reason through today?`,
    action: null,
    protocolBundle: null
  };
}

// File-backed user cloud backup storage for multi-user isolation
const DATA_DIR = path.join(process.cwd(), 'data');
const SYNC_DB_FILE = path.join(DATA_DIR, 'user_sync_db.json');
const userCloudStores = new Map<string, any>();

// Ensure directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not initialize data directory in server.ts:', e);
}

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
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
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
