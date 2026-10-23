/** Single source for product naming. Change the brand here, not in components. */
export const BRAND = {
  name: "Offshora",
  /** Wordmark split: first part in ink, second in the emerald accent. */
  lead: "Off",
  accent: "shora",
  descriptor: "Energy OS",
  tagline: "Every hand-off, on record.",
  description:
    "One operating system for offshore and onshore energy contractors: supply base and deck cargo, rig fuel and bulk supply, crew transfers, vessel charters, bunkering and e-BDN, pipeline integrity, depot reconciliation, haulage e-Waybills, local content, permits and waste. Offline-first, audit-ready.",
} as const;

export const BRAND_FULL = `${BRAND.name} ${BRAND.descriptor}`;
