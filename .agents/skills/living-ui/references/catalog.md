# Living UI Component Catalog

This is the registry of curated, de-slopped UI components stored in `resources/components/`.
Check here first before querying external sources.

| Name | Category | Path | Dependencies | Origin | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| WorkflowActionDialog | `overlays` | `resources/components/overlays/workflow-action-dialog.tsx` | react | 21st.dev/shadcn/alert-dialog#705 | Accessible native-dialog confirmation form for audited workflow transitions with stage-specific context and required reasons |
| StemGauge | `data-display` | `resources/components/data-display/stem-gauge.tsx` | react | 21st.dev/thegridcn/energy-meter#24473 | Segmented animated fill gauge for a bunker stem's delivered-vs-nominated MT, dark HUD readout matching this app's AstmCalculatorModal/e-BDN panels |
| PromptBentoGrid | `data-display` | `resources/components/data-display/prompt-bento-grid.jsx` | react,lucide-react | 21st.dev/0xUrvish/bento-card#10457 | Interactive question starters & operational audit bento cards |
| DockComposer | `inputs` | `resources/components/inputs/dock-composer.jsx` | react,lucide-react | 21st.dev/serafimcloud/input-bar#12399 | Modern expanding AI prompt dock with bottom action slots and keyboard shortcuts |
| StatusBadge | `feedback` | `resources/components/feedback/status-badge.tsx` | react | internal | Micro-pulsing status badge with accessible ARIA role and semantic theme colors |
| *Template Entry* | `core` | `resources/components/core/` | none | internal | Template format reference |

---

## Component Categories
- **`navigation`**: Docks, command bars, breadcrumbs, contextual tabs, mobile drawers.
- **`data-display`**: Bento grids, activity feeds, metrics cards, stat counters, timelines.
- **`feedback`**: Glowing badges, toast alerts, status pulses, skeleton loaders.
- **`overlays`**: Modals, slide-overs, command palettes, sheet dialogs.
- **`inputs`**: Smart search bars, multi-tag pickers, date-time pickers, animated toggles.
- **`marketing`**: Feature grids, pricing comparison matrices, hero showcases.
