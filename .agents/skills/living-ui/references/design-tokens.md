# Design Tokens & De-Slopping Adaptation Standards

When importing or converting components from 21st.dev into the Living UI library or a specific project, apply these transformations:

---

## 1. Design Token Translation Matrix

Many 21st.dev components use standard Tailwind colors (e.g. `bg-zinc-900`, `text-neutral-400`, `bg-blue-600`) or hardcoded hex colors. Translate them into semantic, theme-aware tokens:

| 21st.dev Typical Value | Semantic Token Replacement | CSS Variable Alternative |
| :--- | :--- | :--- |
| `bg-black`, `bg-zinc-950` | `bg-background` | `hsl(var(--background))` |
| `bg-zinc-900`, `bg-neutral-800` | `bg-card` or `bg-surface` | `hsl(var(--card))` |
| `bg-zinc-800`, `bg-neutral-700` | `bg-muted` / `bg-accent` | `hsl(var(--muted))` |
| `border-zinc-800`, `border-white/10` | `border-border` | `hsl(var(--border))` |
| `text-zinc-100`, `text-white` | `text-foreground` | `hsl(var(--foreground))` |
| `text-zinc-400`, `text-neutral-500` | `text-muted-foreground` | `hsl(var(--muted-foreground))` |
| `bg-blue-600`, `bg-indigo-600` | `bg-primary text-primary-foreground` | `hsl(var(--primary))` |

---

## 2. Mandatory De-Slopping Rules

1. **Purge "AI Slop Copy"**:
   - Replace "Supercharge your workflow", "Unlock boundless intelligence", "Next-gen insights" with functional, domain-accurate text.
2. **Keyboard Accessibility**:
   - Every interactive element must be reachable via `Tab`.
   - Modals and drawers must close on `Escape`.
   - Buttons must trigger on `Enter` and `Space`.
   - Never suppress `outline` without providing `focus-visible:ring-2 focus-visible:ring-primary`.
3. **Motion Sensitivity**:
   - Respect `prefers-reduced-motion`. In Framer Motion, wrap spring/bounce animations or provide reduced motion fallbacks.
4. **Resilience & Responsive Constraints**:
   - Ensure components do not break at mobile viewports (`375px`) or ultrawide (`1440px+`).
   - Guard against text overflow using `truncate`, `line-clamp`, or flexible wrap.
