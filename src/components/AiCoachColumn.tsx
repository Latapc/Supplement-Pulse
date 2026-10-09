import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Utensils, MessageSquare, BookOpen, ClipboardList } from 'lucide-react';

interface AiCoachColumnProps {
  onOpenChat: (initialPrompt?: string, specialMode?: boolean) => void;
  supplementsCount: number;
  section: 'today' | 'stash';
}

export const AiCoachColumn: React.FC<AiCoachColumnProps> = ({
  onOpenChat,
  supplementsCount,
  section,
}) => {
  const [quickQuestion, setQuickQuestion] = useState('');

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuestion.trim()) return;
    onOpenChat(quickQuestion.trim(), false);
    setQuickQuestion('');
  };

  const quickProtocols = [
    {
      label: 'Understand a label',
      desc: 'Plain-language explanation',
      icon: BookOpen,
      prompt: 'Help me understand the wording on a supplement label. Explain common terms and uncertainties in plain language; do not recommend a dose or tell me to start taking it.',
      isSpecial: false,
    },
    {
      label: 'Safety questions',
      desc: 'Prepare for a pharmacist',
      icon: ShieldCheck,
      prompt: 'Help me prepare neutral questions for a pharmacist about possible supplement and medication interactions. Explain that a professional needs my full medication list and health context; do not diagnose or prescribe.',
      isSpecial: false,
    },
    {
      label: 'Review my records',
      desc: 'Summarize logged information',
      icon: ClipboardList,
      prompt: 'Summarize my saved supplement records and dose logs only. Flag missing information or entries I may want to verify, without suggesting new supplements or changing doses.',
      isSpecial: false,
    },
    {
      label: 'Food & label terms',
      desc: 'Learn the basics',
      icon: Utensils,
      prompt: 'Explain common supplement label terms such as serving size, active ingredient, and directions. Keep it educational and remind me that label directions and professional advice matter.',
      isSpecial: false,
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-5 sm:p-6 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white font-display">
                Regimen AI Coach
              </h3>
              <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Gemini Powered
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              {section === 'today'
                ? 'Get personalized timing advice, dose reminders, or check safety conflicts for today\'s intake.'
                : 'Review your saved list and learn how to interpret supplement labels safely.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenChat()}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-700/80 rounded-xl transition self-start sm:self-center shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Open AI Coach Drawer</span>
        </button>
      </div>

      {/* Interactive Quick Input */}
      <form onSubmit={handleAsk} className="mt-4 flex items-center gap-2 w-full">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={quickQuestion}
            onChange={(e) => setQuickQuestion(e.target.value)}
            placeholder={
              section === 'today'
                ? "Ask about a label term or how to prepare for a pharmacist visit..."
                : "Ask to summarize your saved records or explain label wording..."
            }
            className="w-full px-4 py-2.5 text-xs sm:text-sm bg-stone-50 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 rounded-2xl text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
          />
        </div>
        <button
          type="submit"
          disabled={!quickQuestion.trim()}
          className="px-4 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs sm:text-sm font-semibold rounded-2xl hover:bg-stone-800 dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shrink-0"
        >
          <span>Ask</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      <p className="mt-2 text-[11px] leading-5 text-stone-500 dark:text-stone-400">
        Educational support only—not medical advice. The coach cannot determine a safe dose or replace a clinician or pharmacist.
      </p>

      {/* Suggested Quick Protocol Chips */}
      <div className="mt-3.5">
        <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
          Helpful questions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {quickProtocols.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onOpenChat(item.prompt, item.isSpecial)}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/70 hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-left transition group"
              >
                <div className="w-7 h-7 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0 text-stone-700 dark:text-stone-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
