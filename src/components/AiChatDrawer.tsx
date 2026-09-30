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
  Brain,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  Zap
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
  thinkingProcess?: string;
  protocolName?: string;
  protocolBundle?: {
    protocolName: string;
    description: string;
    supplements: Partial<Supplement>[];
  };
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
      protocolBundle?: {
        protocolName: string;
        description: string;
        supplements: Partial<Supplement>[];
      };
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
        ? "⚡ Welcome to Clinical Regimen Formulation. I am Dr. Maya Pulse, PhD — Lead Clinical Biochemist & Longevity Protocol Specialist, powered by Gemini. Rather than relying on generic templates, I think through underlying human biology, cellular pathways, and receptor kinetics to formulate original clinical protocols tailored to you. Tell me your physiological goals, and I will reason through mechanisms and build your custom regimen."
        : "Hello! I am Dr. Maya Pulse, PhD — Lead Clinical Biochemist & Protocol Specialist at Supple Pulse, powered by Gemini. Tell me your goals, sleep patterns, afternoon energy dips, or cognitive demands. I will analyze your biological pathways, audit your stack for nutrient competition, and formulate an original clinical protocol with bioavailable forms, exact timing, and cycling rules.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
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
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  const toggleThinking = (id: string) => {
    setExpandedThinking((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // High reliability fallback parser ONLY in case server is completely offline
  const interpretLocally = (text: string) => {
    const lower = text.toLowerCase();
    const todayStr = formatDateToYYYYMMDD(new Date());

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

    return {
      thinkingProcess: 'Analyzing your regimen state and active supplements across circadian timing intervals.',
      reply: `You currently have ${supplements.length} active supplements in your protocol. You can ask me to formulate custom protocols for afternoon energy, deep slow-wave sleep, cognitive focus, or configure cyclic schedules like Boron 2 weeks ON / 1 week OFF for life.`,
      action: null,
    };
  };

  const handleApplyProtocolBundle = (msgId: string, bundle: { protocolName: string; description: string; supplements: Partial<Supplement>[] }) => {
    const snapshot: ChatActionSnapshot = {
      id: `action-bundle-${Date.now()}`,
      type: 'add_supplement',
      description: `Formulated & Applied: ${bundle.protocolName} (${bundle.supplements.length} items)`,
      previousSupplements: JSON.parse(JSON.stringify(supplements)),
      previousLogs: JSON.parse(JSON.stringify(logs)),
      isUndone: false,
    };

    onApplyChatAction(
      {
        type: 'apply_protocol_bundle',
        description: `Applied ${bundle.protocolName}`,
        protocolBundle: bundle,
      },
      snapshot
    );

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, actionSnapshot: snapshot } : m))
    );
    playChimeSound('dose_taken');
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

      const botMsgId = `msg-${Date.now() + 1}`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'assistant',
        text: data.reply || "Protocol formulated successfully.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thinkingProcess: data.thinkingProcess,
        protocolName: data.protocolName,
        protocolBundle: data.protocolBundle,
        actionSnapshot: snapshot,
      };

      // Automatically expand thinking process by default so user sees her reasoning!
      if (data.thinkingProcess) {
        setExpandedThinking((prev) => ({ ...prev, [botMsgId]: true }));
      }

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const localRes = interpretLocally(trimmed);
      const botMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: localRes.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thinkingProcess: localRes.thinkingProcess,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = (msgId: string, snapshot: ChatActionSnapshot) => {
    onUndoAction(snapshot);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId && msg.actionSnapshot
          ? {
              ...msg,
              actionSnapshot: {
                ...msg.actionSnapshot,
                isUndone: true,
              },
            }
          : msg
      )
    );
  };

  const protocolPrompts = [
    "Formulate an original Deep SWS Sleep & cortisol reset protocol",
    "Formulate an original Dopamine & sustained executive focus stack",
    "Audit my active stash for biochemical synergies & competitive absorption",
    "Formulate an original Longevity, NAD+ & mitochondrial energy regimen",
    "Formulate a pulsed Boron protocol (2 weeks on / 1 week off) for free testosterone",
    "Formulate an original Joint, Collagen & Tendon matrix protocol"
  ];

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-stone-900 shadow-2xl border-l border-stone-200 dark:border-stone-800 flex flex-col">
        {/* Header - Dr. Maya Pulse Persona */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center relative shrink-0">
              <Brain className="w-5 h-5" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-stone-900 absolute -bottom-0.5 -right-0.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display leading-tight flex items-center gap-1.5">
                <span>Dr. Maya Pulse, PhD</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded-md">
                  Gemini 3
                </span>
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-stone-300">
                <span>Clinical Biochemist & Protocol Specialist</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Special Protocol Mode Notice */}
        {specialMode && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Original Protocol Formulation & Cycling Active</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Dr. Maya reasons through molecular pathways, receptor sensitivity, and circadian intervals to build custom multi-week protocols and lifetime stacks.
              </p>
            </div>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50 dark:bg-stone-950/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-tr-xs shadow-xs'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-xs shadow-xs'
                }`}
              >
                {/* Clinical Thought Process & Biochemical Reasoning (Collapsible) */}
                {msg.thinkingProcess && (
                  <div className="mb-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 p-2.5 text-xs text-indigo-950 dark:text-indigo-200">
                    <button
                      type="button"
                      onClick={() => toggleThinking(msg.id)}
                      className="w-full flex items-center justify-between font-semibold text-indigo-900 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Clinical Thought Process & Biochemical Rationale</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80 flex items-center gap-1">
                        {expandedThinking[msg.id] ? (
                          <><span>Hide</span><ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <><span>View Reasoning</span><ChevronDown className="w-3 h-3" /></>
                        )}
                      </span>
                    </button>
                    {expandedThinking[msg.id] && (
                      <div className="mt-2 pt-2 border-t border-indigo-200/80 dark:border-indigo-900/50 text-[11px] leading-relaxed whitespace-pre-wrap font-sans opacity-95 text-indigo-900 dark:text-indigo-200">
                        {msg.thinkingProcess}
                      </div>
                    )}
                  </div>
                )}

                {/* Formulated Protocol Title Badge */}
                {msg.protocolName && (
                  <div className="mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-2xs">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Custom Protocol: {msg.protocolName}</span>
                  </div>
                )}

                {/* Main Reply Body */}
                <div className="whitespace-pre-wrap leading-relaxed text-stone-800 dark:text-stone-200">
                  {msg.text}
                </div>

                {/* Protocol Bundle Multi-Supplement Card */}
                {msg.protocolBundle && msg.protocolBundle.supplements?.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Formulated Protocol Items ({msg.protocolBundle.supplements.length})
                      </span>
                      {msg.protocolBundle.protocolName && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[150px]">
                          {msg.protocolBundle.protocolName}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {msg.protocolBundle.supplements.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs">
                          <div>
                            <span className="font-bold text-stone-900 dark:text-white">{s.name}</span>
                            <span className="text-stone-500 dark:text-stone-400 ml-1.5">
                              {s.doseAmount} {s.unit} · {s.doseTime || '09:00'} ({s.foodTiming?.replace('_', ' ') || 'with food'})
                            </span>
                            {s.cycleConfig?.isCyclic && (
                              <span className="ml-1.5 text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-sm font-semibold">
                                {s.cycleConfig.onDays}d ON / {s.cycleConfig.offDays}d OFF
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {!msg.actionSnapshot ? (
                      <button
                        type="button"
                        onClick={() => handleApplyProtocolBundle(msg.id, msg.protocolBundle!)}
                        className="w-full mt-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Apply Full Protocol to Regimen (+{msg.protocolBundle.supplements.length} items)</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between mt-2 pt-1 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Protocol Added to Regimen</span>
                        </span>
                        {!msg.actionSnapshot.isUndone ? (
                          <button
                            type="button"
                            onClick={() => handleUndo(msg.id, msg.actionSnapshot!)}
                            className="px-2.5 py-1 text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3 text-stone-500" />
                            <span>Undo</span>
                          </button>
                        ) : (
                          <span className="italic text-stone-400 text-[11px]">Reverted</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Single Action Badge & Undo Button */}
                {!msg.protocolBundle && msg.actionSnapshot && (
                  <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{msg.actionSnapshot.description}</span>
                    </div>

                    {!msg.actionSnapshot.isUndone ? (
                      <button
                        type="button"
                        onClick={() => handleUndo(msg.id, msg.actionSnapshot!)}
                        className="flex items-center gap-1.5 w-fit px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition cursor-pointer"
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

          {/* Thinking State */}
          {isLoading && (
            <div className="flex items-start gap-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-3.5 rounded-2xl w-fit shadow-xs">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <span>Dr. Maya Pulse is analyzing & formulating...</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Evaluating metabolic pathways, receptor dynamics, circadian timing, and synergies...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Protocol Prompts */}
        <div className="p-2 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-x-auto flex gap-1.5 scrollbar-none">
          {protocolPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInput(prompt)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-xl transition font-medium shrink-0 flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Input Box */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask Dr. Maya to formulate a protocol, check interactions, or set cycling..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 h-11 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-11 px-4 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 disabled:opacity-40 rounded-xl flex items-center justify-center transition shadow-xs cursor-pointer shrink-0"
              title="Send to Dr. Maya Pulse"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
