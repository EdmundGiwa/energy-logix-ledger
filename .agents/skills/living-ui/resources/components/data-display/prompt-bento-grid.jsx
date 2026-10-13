import React from "react";
import { Sparkles, ArrowUpRight, MessageSquareText, ShieldAlert, Wrench, Users } from "lucide-react";
import { T, alpha } from "../../../../frontend/whisper360-app/whisper360-app/src/theme/tokens.jsx";

/**
 * PromptBentoGrid — Interactive question starters & operational audit cards.
 * Origin: 21st.dev/0xUrvish/bento-card#10457.
 * De-slopped: grounded in operational workspace triage, accessible keyboard triggers.
 */
export function PromptBentoGrid({ onSelectPrompt }) {
  const suggestions = [
    {
      id: "customer-intent",
      category: "Customer & Promises",
      icon: Users,
      headline: "Customer commitments",
      question: "What does this customer need most, what was promised, and who owns the follow-up?",
      accent: T.brandDeep,
    },
    {
      id: "operations-triage",
      category: "Live Operations",
      icon: ShieldAlert,
      headline: "Urgent bottlenecks",
      question: "Which customer conversations or agent handoffs currently need urgent attention?",
      accent: "#E53E3E",
    },
    {
      id: "tool-evidence",
      category: "Tool & Knowledge",
      icon: Wrench,
      headline: "Tool execution audit",
      question: "What tool results and data sources did Whisper use to answer the latest queries?",
      accent: "#3182CE",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: alpha(T.brandDeep, 12), color: T.brandDeep }}
          >
            <Sparkles size={12} />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.inkSoft }}>
            Suggested questions
          </span>
        </div>
        <span className="text-[11px]" style={{ color: T.inkFaint }}>
          Click to start a thread
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {suggestions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt?.(item.question)}
              className="group relative flex flex-col justify-between text-left p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                background: T.surface,
                borderColor: T.line,
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-105"
                    style={{ background: alpha(item.accent, 12), color: item.accent }}
                  >
                    <Icon size={14} />
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: alpha(T.inkSoft, 8), color: T.inkSoft }}
                  >
                    {item.category}
                  </span>
                </div>
                <h4 className="text-xs font-bold" style={{ color: T.ink }}>
                  {item.headline}
                </h4>
                <p className="mt-1 text-xs line-clamp-3 leading-relaxed" style={{ color: T.inkSoft }}>
                  "{item.question}"
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1 text-[11px] font-medium transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400" style={{ color: T.inkFaint }}>
                <span>Ask this</span>
                <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
