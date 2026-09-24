import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  Bot, 
  User, 
  AlertCircle,
  Loader2,
  CornerDownLeft
} from 'lucide-react';
import { Supplement, DoseLog } from '../types/supplement';
import { calculateEndDate, formatDateToYYYYMMDD } from '../utils/dates';
import { playChimeSound } from '../utils/audio';

export interface ChatActionSnapshot {
  id: string;
  type: 'add_supplement' | 'update_supplement' | 'delete_supplement' | 'log_dose' | 'renew_course';
  description: string;
  previousSupplements: Supplement[];
  previousLogs: DoseLog[];
  isUndone: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionSnapshot?: ChatActionSnapshot;
}

interface AiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplements: Supplement[];
  logs: DoseLog[];
  specialMode?: boolean;
  initialPrompt?: string;
  onApplyChatAction: (
    action: {
      type: string;
      description: string;
      supplement?: Partial<Supplement>;
      supplementId?: string;
      doseLog?: { supplementId: string; amountTaken: number; notes?: string };
    },
    snapshot: ChatActionSnapshot
  ) => void;
  onUndoAction: (snapshot: ChatActionSnapshot) => void;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  isOpen,
  onClose,
  supplements,
  logs,
  specialMode = false,
  initialPrompt,
  onApplyChatAction,
  onUndoAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: specialMode
        ? "⚡ Welcome to Special Regimens! I can set up complex cyclic schedules like 'Boron 6mg: 2 weeks on, 1 week off for life', multi-week tapering, or permanent infinity regimens that never stop. How would you like to structure your intake?"
        : "Hello! I am your AI Regimen Assistant powered by Gemini. You can ask me to add lifetime supplements ('Take Vitamin D3 60,000 IU for life'), set up cyclic protocols (e.g. Boron 2 weeks on, 1 week off), log doses, or manage your schedule. Every action includes an instant Undo option.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Fallback rule-based interpreter in case the server API is unavailable
  const interpretLocally = (text: string) => {
    const lower = text.toLowerCase();
    const todayStr = formatDateToYYYYMMDD(new Date());

    // Pattern 1: Add or configure supplement / cyclic protocol / for life
    const isLogIntent = lower.includes('log') || lower.includes('took') || lower.includes('taken');
    const isDeleteIntent = lower.includes('delete') || lower.includes('remove');
    const isAddIntent = 
      lower.includes('add') || 
      lower.includes('create') || 
      lower.includes('track') || 
      lower.includes('take') || 
      lower.includes('boron') || 
      lower.includes('vitamin') || 
      lower.includes('b12') || 
      lower.includes('b-12') || 
      lower.includes('magnesium') || 
      lower.includes('omega') || 
      lower.includes('creatine') || 
      lower.includes('ashwagandha') || 
      lower.includes('zinc') || 
      lower.includes('cycle') || 
      lower.includes('for life') || 
      lower.includes('repeat') || 
      lower.includes('daily') || 
      lower.includes('weekly') || 
      lower.includes('mg') || 
      lower.includes('iu');

    if (!isLogIntent && !isDeleteIntent && isAddIntent) {
      let name = 'Custom Supplement';
      let amount = 1000;
      let unit: any = 'mg';
      let category: any = 'vitamins';
      let freq: any = 'daily';
      let days = [1];
      let periodVal = 3;
      let periodUnit: any = 'months';

      if (lower.includes('boron') || (lower.includes('week') && lower.includes('off'))) {
        name = 'Boron';
        amount = 6;
        unit = 'mg';
        category = 'minerals';
        freq = 'daily';
      } else if (lower.includes('vitamin d') || lower.includes('vit d')) {
        name = 'Vitamin D3 (Cholecalciferol)';
        amount = 60000;
        unit = 'IU';
        freq = 'weekly';
        days = [1]; // Monday
      } else if (lower.includes('b12') || lower.includes('b-12')) {
        name = 'Vitamin B12 (Methylcobalamin)';
        amount = 1500;
        unit = 'mg';
        freq = 'weekly';
        days = [1];
      } else if (lower.includes('magnesium')) {
        name = 'Magnesium Glycinate';
        amount = 400;
        unit = 'mg';
        freq = 'daily';
      } else if (lower.includes('omega') || lower.includes('fish oil')) {
        name = 'Omega-3 Fish Oil';
        amount = 1000;
        unit = 'mg';
        freq = 'daily';
      } else if (lower.includes('vitamin c')) {
        name = 'Vitamin C (Ascorbic Acid)';
        amount = 1000;
        unit = 'mg';
        freq = 'daily';
      } else if (lower.includes('zinc')) {
        name = 'Zinc Picolinate';
        amount = 25;
        unit = 'mg';
        freq = 'daily';
      }

      // Extract numbers if present
      const numMatch = lower.match(/(\d+[\d,]*)\s*(iu|mg|mcg|g)/);
      if (numMatch) {
        amount = Number(numMatch[1].replace(/,/g, ''));
        unit = numMatch[2].toLowerCase() === 'iu' ? 'IU' : numMatch[2].toLowerCase();
      }

      // Extract expiry date if present
      let expiryDate: string | undefined = undefined;
      const expMatch = lower.match(/(?:expir(?:y|es|ed)?|best by|use by)\s*(?:date)?\s*(?:is|on|:|to)?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i);
      if (expMatch) {
        expiryDate = expMatch[1].replace(/\//g, '-');
      }

      // Check if user requested For Life / Infinity
      const isForLife = lower.includes('for life') || lower.includes('infinity') || lower.includes('forever') || lower.includes("don't stop") || lower.includes("never stop");
      
      // Check if user requested a cyclic protocol (e.g. Boron 2 weeks on, 1 week off)
      const isCyclic = lower.includes('boron') || lower.includes('cycle') || (lower.includes('week') && (lower.includes('off') || lower.includes('break')));
      let cycleConfig: any = undefined;
      if (isCyclic) {
        let onDays = 14;
        let offDays = 7;
        const weekPattern1 = lower.match(/(\d+)\s*weeks?.*?(?:break|off|pause|don't\s*take).*?(\d+)\s*weeks?/i);
        const weekPattern2 = lower.match(/(\d+)\s*weeks?\s*(?:on|every day|daily).*?(\d+)\s*weeks?\s*(?:off|break|pause)/i);
        if (weekPattern1) {
          onDays = Number(weekPattern1[1]) * 7;
          offDays = Number(weekPattern1[2]) * 7;
        } else if (weekPattern2) {
          onDays = Number(weekPattern2[1]) * 7;
          offDays = Number(weekPattern2[2]) * 7;
        }
        const onLabel = onDays >= 7 && onDays % 7 === 0 ? `${onDays / 7} weeks` : `${onDays} days`;
        const offLabel = offDays >= 7 && offDays % 7 === 0 ? `${offDays / 7} week` : `${offDays} days`;
        cycleConfig = {
          isCyclic: true,
          onDays,
          offDays,
          cycleStartDate: todayStr,
          patternDescription: `Take daily for ${onLabel}, then pause for ${offLabel} (cycles continuously)`,
        };
      }

      // Check duration
      const durationMatch = lower.match(/(\d+)\s*(month|week|day)/);
      if (durationMatch && !isForLife) {
        periodVal = Number(durationMatch[1]);
        periodUnit = durationMatch[2].startsWith('month') ? 'months' : durationMatch[2].startsWith('week') ? 'weeks' : 'days';
      }

      const durationType = (isForLife || isCyclic) ? 'infinity' : 'fixed';
      const endDate = durationType === 'fixed' ? calculateEndDate(todayStr, periodVal, periodUnit) : undefined;

      const replyDescription = isCyclic
        ? `I have configured ${name} (${amount.toLocaleString()} ${unit}) as a special cyclic protocol: ${cycleConfig.patternDescription} for life! Currently in Active Phase: Day 1 of ${cycleConfig.onDays}.${expiryDate ? ` Expiry date set to ${expiryDate}.` : ''}`
        : isForLife
        ? `I've set up ${name} (${amount.toLocaleString()} ${unit}) for life (infinity duration). Reminders will stay permanently active and never stop or expire.${expiryDate ? ` Expiry date set to ${expiryDate}.` : ''}`
        : `I've added ${name} (${amount.toLocaleString()} ${unit}) to your protocol, scheduled ${freq === 'weekly' ? 'weekly on Monday' : 'daily'} for ${periodVal} ${periodUnit} (ends ${endDate}).${expiryDate ? ` Expiry date set to ${expiryDate}.` : ''}`;

      return {
        reply: replyDescription,
        action: {
          type: 'add_supplement',
          description: isCyclic
            ? `Added ${name} (${amount.toLocaleString()} ${unit}, ${cycleConfig.onDays / 7}w ON / ${cycleConfig.offDays / 7}w OFF cycle for life)`
            : isForLife
            ? `Added ${name} (${amount.toLocaleString()} ${unit}, Permanent ∞ For Life)`
            : `Added ${name} (${amount.toLocaleString()} ${unit}, ${periodVal} ${periodUnit})`,
          supplement: {
            name,
            doseAmount: amount,
            unit,
            form: 'capsule',
            category,
            colorTag: 'emerald',
            frequencyType: freq,
            selectedDays: days,
            doseTime: '09:00',
            foodTiming: 'with_food',
            cycleConfig,
            expiryDate,
            duration: {
              type: durationType,
              startDate: todayStr,
              endDate,
              periodValue: durationType === 'fixed' ? periodVal : undefined,
              periodUnit: durationType === 'fixed' ? periodUnit : undefined,
            },
            notes: isCyclic ? 'Special cyclic protocol (Gemini AI)' : isForLife ? 'Regimen for life (Infinity)' : 'Added by AI Assistant',
          },
        },
      };
    }

    // Pattern 2: Log dose
    if (lower.includes('log') || lower.includes('took') || lower.includes('taken')) {
      const match = supplements.find((s) => lower.includes(s.name.toLowerCase().split(' ')[0]));
      const target = match || supplements[0];
      if (target) {
        return {
          reply: `Recorded your dose of ${target.name} (${target.doseAmount.toLocaleString()} ${target.unit}) for today!`,
          action: {
            type: 'log_dose',
            description: `Logged ${target.doseAmount.toLocaleString()} ${target.unit} of ${target.name}`,
            doseLog: {
              supplementId: target.id,
              amountTaken: target.doseAmount,
              notes: 'Logged via AI Chat',
            },
          },
        };
      }
    }

    // Pattern 3: Delete / Remove
    if (lower.includes('delete') || lower.includes('remove')) {
      const match = supplements.find((s) => lower.includes(s.name.toLowerCase().split(' ')[0]));
      if (match) {
        return {
          reply: `I have removed ${match.name} from your regimen.`,
          action: {
            type: 'delete_supplement',
            description: `Removed ${match.name}`,
            supplementId: match.id,
          },
        };
      }
    }

    // Pattern 4: Check Expiry Dates
    if (lower.includes('expir') || lower.includes('shelf life') || lower.includes('freshness')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expired = supplements.filter((s) => {
        if (!s.expiryDate) return false;
        const [y, m, d] = s.expiryDate.split('-').map(Number);
        const exp = new Date(y, m - 1, d);
        return exp < today;
      });
      const expiringSoon = supplements.filter((s) => {
        if (!s.expiryDate) return false;
        const [y, m, d] = s.expiryDate.split('-').map(Number);
        const exp = new Date(y, m - 1, d);
        const diff = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 30;
      });

      if (expired.length > 0 || expiringSoon.length > 0) {
        let msg = '';
        if (expired.length > 0) {
          msg += `⚠️ Expired Bottles:\n${expired.map((s) => `• ${s.name} (Expired on ${s.expiryDate})`).join('\n')}\n\n`;
        }
        if (expiringSoon.length > 0) {
          msg += `⏳ Expiring Soon (Within 30 Days):\n${expiringSoon.map((s) => `• ${s.name} (Expires ${s.expiryDate})`).join('\n')}`;
        }
        return {
          reply: msg.trim(),
          action: null,
        };
      } else {
        return {
          reply: 'Great news! All supplements with recorded expiry dates are fresh and within their safe shelf life.',
          action: null,
        };
      }
    }

    // Pattern 5: Chatbot status / help inquiry
    if (lower.includes('not working') || lower.includes("doesn't work") || lower.includes('broken') || lower.includes('help')) {
      return {
        reply: `I am fully active, listening, and ready to update your protocol! You can type commands like:
• "Boron 6 mg: take every day for 2 weeks, then break for 1 week, repeat for life"
• "Vitamin D3 60,000 IU for life"
• "Add Zinc 25mg with expiry 2026-12-31"
• "Check expiry dates"
• "I took my dose today"

Or tap any of the quick action pills below!`,
        action: null,
      };
    }

    // Default general answers
    return {
      reply: `You currently have ${supplements.length} active supplements in your protocol. You can ask me to add any supplement with a duration timer, configure cyclic protocols, track bottle expiry dates, or log doses.`,
      action: null,
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          currentSupplements: supplements,
          currentLogs: logs,
          currentDate: formatDateToYYYYMMDD(new Date()),
        }),
      });

      let data: any;
      if (response.ok) {
        data = await response.json();
      } else {
        data = interpretLocally(trimmed);
      }

      if (!data || !data.reply) {
        data = interpretLocally(trimmed);
      }

      // If server returned text without action, verify if client can extract an action
      if (!data.action) {
        const localCheck = interpretLocally(trimmed);
        if (localCheck && localCheck.action) {
          data = localCheck;
        }
      }

      let snapshot: ChatActionSnapshot | undefined = undefined;

      if (data.action && data.action.type) {
        snapshot = {
          id: `action-${Date.now()}`,
          type: data.action.type,
          description: data.action.description || 'Regimen change implemented',
          previousSupplements: JSON.parse(JSON.stringify(supplements)),
          previousLogs: JSON.parse(JSON.stringify(logs)),
          isUndone: false,
        };

        playChimeSound('dose_taken');
        onApplyChatAction(data.action, snapshot);
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionSnapshot: snapshot,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // Local fallback
      const localRes = interpretLocally(trimmed);
      let snapshot: ChatActionSnapshot | undefined = undefined;

      if (localRes.action) {
        snapshot = {
          id: `action-${Date.now()}`,
          type: localRes.action.type as any,
          description: localRes.action.description,
          previousSupplements: JSON.parse(JSON.stringify(supplements)),
          previousLogs: JSON.parse(JSON.stringify(logs)),
          isUndone: false,
        };
        onApplyChatAction(localRes.action as any, snapshot);
      }

      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: localRes.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionSnapshot: snapshot,
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = (msgId: string, snapshot: ChatActionSnapshot) => {
    onUndoAction(snapshot);
    playChimeSound('dose_due');

    // Update message state so it shows action reverted
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.actionSnapshot) {
          return {
            ...m,
            actionSnapshot: { ...m.actionSnapshot, isUndone: true },
          };
        }
        return m;
      })
    );
  };

  const specialPrompts = [
    'Boron 6 mg: take every day for 2 weeks, then 1 week off, repeat for life',
    'Vitamin D3 60000 IU weekly for life (Infinity - never stop)',
    'Creatine 5g: 5 days loading then 5g daily for life',
    'Ashwagandha 600mg: 6 weeks daily, then 2 weeks off',
  ];

  const standardPrompts = [
    'What do I have left to take today?',
    'Check expiring supplements',
    'I took my dose today',
    'Add Zinc 25mg with expiry 2026-12-31',
    'Add Vitamin B12 1500 mcg weekly for life',
  ];

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-stone-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-display leading-tight flex items-center gap-2">
              <span>{specialMode ? 'Special Regimens & Cycling' : 'Regimen AI Assistant'}</span>
              {specialMode && (
                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded-full">
                  Special
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-stone-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Powered by Gemini · Direct execution & undo</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Special Protocol Mode Highlight Card */}
      {specialMode && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Custom & Cyclic Protocols (Boron, Ashwagandha, Infinity)</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Gemini handles non-standard multi-week cycling (e.g. 2 weeks on / 1 week off) and permanent infinity durations automatically.
            </p>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-stone-900 text-white rounded-tr-xs'
                  : 'bg-white border border-stone-200 text-stone-800 rounded-tl-xs shadow-xs'
              }`}
            >
              <p>{msg.text}</p>

              {/* Action Badge & Undo Button */}
              {msg.actionSnapshot && (
                <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{msg.actionSnapshot.description}</span>
                  </div>

                  {!msg.actionSnapshot.isUndone ? (
                    <button
                      onClick={() => handleUndo(msg.id, msg.actionSnapshot!)}
                      className="flex items-center gap-1.5 w-fit px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                      <span>Undo this action</span>
                    </button>
                  ) : (
                    <div className="text-xs text-stone-400 flex items-center gap-1 italic">
                      <RotateCcw className="w-3 h-3" />
                      <span>Action reverted</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <span className="text-[10px] text-stone-400 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-stone-500 bg-white border border-stone-200 p-3 rounded-2xl w-fit shadow-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Analyzing and updating protocol...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2 border-t border-stone-100 bg-white overflow-x-auto flex gap-1.5 scrollbar-none">
        {(specialMode ? [...specialPrompts, ...standardPrompts] : [...standardPrompts, ...specialPrompts]).map((prompt, idx) => {
          const isSpecial = specialPrompts.includes(prompt);
          return (
            <button
              key={idx}
              onClick={() => setInput(prompt)}
              className={`text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg transition font-medium shrink-0 flex items-center gap-1 ${
                isSpecial
                  ? 'bg-amber-100/80 text-amber-900 hover:bg-amber-200 border border-amber-200/60'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {isSpecial && <Sparkles className="w-3 h-3 text-amber-600" />}
              <span>{prompt}</span>
            </button>
          );
        })}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={specialMode ? "E.g. Boron 6mg 2 weeks on, 1 week off for life..." : "Tell AI to add, log, or change supplements..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-11 px-3.5 rounded-xl border border-stone-300 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-11 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
    </>
  );
};
