import React, { useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, CornerDownLeft } from "lucide-react";
import { T, alpha } from "../../../../frontend/whisper360-app/whisper360-app/src/theme/tokens.jsx";

/**
 * DockComposer — De-slopped & token-adapted AI chat composer dock.
 * Origin: 21st.dev/serafimcloud/input-bar (id: 12399).
 * Adapted for Whisper360 design tokens, auto-expanding textarea, slot actions, and accessibility.
 */
export function DockComposer({
  value,
  onChange,
  onSubmit,
  waiting = false,
  placeholder = "Ask about this workspace...",
  leftActions = null,
  rightActions = null,
  className = "",
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea height to match content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 160);
    el.style.height = `${nextHeight}px`;
  }, [value]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      if (!waiting && value?.trim()) {
        onSubmit?.();
      }
    }
  };

  const hasText = Boolean(value?.trim());

  return (
    <div
      className={`relative w-full rounded-2xl border transition-all duration-200 shadow-sm focus-within:shadow-md ${className}`}
      style={{
        background: T.surface,
        borderColor: hasText ? alpha(T.brandDeep, 40) : T.line,
        boxShadow: hasText ? `0 0 0 1px ${alpha(T.brandDeep, 15)}` : "none",
      }}
    >
      {/* Textarea Area */}
      <div className="px-4 pt-3 pb-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder}
          aria-label="Ask Whisper question input"
          className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-zinc-400"
          style={{ color: T.ink }}
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 pt-1 border-t border-black/5 dark:border-white/5">
        {/* Left Toolbar Slots (Mode, Scope, Suggestions) */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {leftActions}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {rightActions}

          <button
            type="button"
            onClick={onSubmit}
            disabled={waiting || !hasText}
            aria-label={waiting ? "Whisper is answering..." : "Send question"}
            className="group relative inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: hasText ? T.brandDeep : alpha(T.inkSoft, 15),
              color: hasText ? "#ffffff" : T.inkSoft,
            }}
          >
            {waiting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Answering…</span>
              </>
            ) : (
              <>
                <span>Ask</span>
                <CornerDownLeft size={11} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
