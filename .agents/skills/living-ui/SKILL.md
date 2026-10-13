---
name: living-ui
description: >-
  Evolving design and component system. Use when designing, building, or refining
  UI components, layouts, or micro-interactions. Checks local vetted components first,
  queries 21st.dev on-demand for fresh primitives, applies de-slopping, and ingests
  reusable components into the local library for permanent cross-project use.
---

# Living UI: Self-Updating Component & Design System

A living, self-enriching design system skill that pairs intentional craftsmanship (anti-slop) with a dynamic component stream from 21st.dev.

## Core Tenets
1. **Local Catalog First**: Always inspect `references/catalog.md` before reaching for external sources. If a vetted component exists, reuse and adapt it.
2. **On-Demand 21st.dev Handshake**: If a required UI primitive or micro-interaction is missing locally, query 21st.dev via CLI or MCP.
3. **De-Slop Before Delivery**: Never copy-paste raw third-party code. Strip placeholder copy, harmonize design tokens with project conventions, and guarantee keyboard accessibility.
4. **Ingest for Permanence**: After adapting a high-quality component, save it into `resources/components/` and record it in `references/catalog.md`. Every project turn makes this skill richer.

---

## The Workflow Protocol

```text
[User UI Request]
       │
       ▼
1. Search Local Catalog (`references/catalog.md`)
   ├── Found? ───> Load from `resources/components/` ───┐
   └── Not found? ──> 2. Fetch from 21st.dev           │
                            │                           │
                            ▼                           ▼
                      3. De-Slop & Adapt ◄──────────────┘
                            │
                            ▼
                      4. Ingest into Skill (`scripts/ingest_component.py`)
                            │
                            ▼
                      5. Implement in Project
```

### Step 1: Query Local Catalog
Check `references/catalog.md` for matching keywords (e.g. `bento-grid`, `dock`, `stepper`, `pricing`, `command-palette`). If found, inspect the code in `resources/components/<category>/<name>.tsx`.

### Step 2: Handshake with 21st.dev (When not in catalog)
Run the search helper or CLI:
```bash
# Search for components
bash .agents/skills/living-ui/scripts/fetch_21st.sh search "command palette" 5

# Or direct 21st CLI
21st search "command palette" --type c --limit 5 --json
```

Retrieve the code for the chosen item:
```bash
21st get <component-id> --json
```

### Step 3: De-Slop & Adapt
Audit the component against `references/design-tokens.md`:
* **Typography & Tokens**: Replace ad-hoc colors with CSS variables or design tokens (e.g., `hsl(var(--primary))`, Tailwind semantic classes).
* **Accessibility**: Verify ARIA attributes, semantic tags (`<button>`, `<dialog>`, `<nav>`), keyboard navigation (`Enter`, `Space`, `Escape`), and focus-visible outlines.
* **Contextual Copy**: Remove generic lorem ipsum or marketing fluff. Use realistic, domain-specific text.
* **Dependencies**: Minimize external packages. Keep dependencies strictly to project standards (e.g. `lucide-react`, `framer-motion`).

### Step 4: Ingest into Skill
Persist the component so neither you nor any other agent needs to query 21st.dev for it again:
```bash
python3 .agents/skills/living-ui/scripts/ingest_component.py \
  --name "CommandPalette" \
  --category "navigation" \
  --slug "command-palette" \
  --origin "21st.dev/<component-id>" \
  --deps "lucide-react,framer-motion" \
  --desc "Spotlight-style keyboard search modal with fuzzy grouping" \
  --file "path/to/cleaned-component.tsx"
```

---

## Directory Reference

- `references/catalog.md`: The living registry of cached components, tags, and dependencies.
- `references/design-tokens.md`: Guidelines for token adaptation, colors, typography, and anti-slop rules.
- `resources/components/`: The codebase of de-slopped, reusable components categorized by UX domain (`navigation`, `data-display`, `feedback`, `cards`, `inputs`, `overlays`).
- `scripts/fetch_21st.sh`: Wrapper around the 21st CLI.
- `scripts/ingest_component.py`: Automated catalog registrar and file organizer.
