"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AuthShell, fieldClass } from "@/components/landing/AuthShell";
import { Icon } from "@/components/landing/icons";
import { BlurText, Corners, Reveal } from "@/components/landing/primitives";
import { ApiError } from "@/lib/api";
import {
  COMMON_TIMEZONES,
  COMPANY_SIZES,
  COUNTRIES,
  CURRENT_TOOLS,
  MEETING_FORMATS,
  MODULES,
  OPERATIONS,
  PAIN_POINTS,
  SEGMENTS,
  buildIcs,
  demoApi,
  detectTimezone,
  formatLongDate,
  formatTime,
  recommendModules,
  zoneAbbrev,
  type Availability,
  type CountryKey,
  type DemoReceipt,
  type IconName,
  type MeetingKey,
  type ModuleKey,
  type OperationKey,
  type PainKey,
  type SegmentKey,
  type SizeKey,
  type ToolsKey,
} from "@/lib/demo";
import { SlotPicker } from "./SlotPicker";

const STEPS = ["Business", "Operations", "Blueprint", "Time", "Details"] as const;

const HEADINGS: { title: ReactNode; sub: string }[] = [
  {
    title: (
      <>
        What kind of <span className="text-emerald-600">energy company</span> are you?
      </>
    ),
    sub: "Pick the closest match. You can add your other service lines below.",
  },
  {
    title: (
      <>
        Tell us about your <span className="text-emerald-600">operations.</span>
      </>
    ),
    sub: "This shapes which modules we show and which problems we focus on.",
  },
  {
    title: (
      <>
        Your Offshora <span className="text-emerald-600">blueprint.</span>
      </>
    ),
    sub: "Built from your answers. Switch modules on or off; we'll demo exactly this set.",
  },
  {
    title: (
      <>
        Pick a time that <span className="text-emerald-600">suits you.</span>
      </>
    ),
    sub: "Times are shown in your time zone. We'll send the meeting link by email.",
  },
  {
    title: (
      <>
        Where should we send <span className="text-emerald-600">the invite?</span>
      </>
    ),
    sub: "Last step. We'll confirm by email straight away.",
  },
];

type Form = {
  segment: SegmentKey | null;
  operations: OperationKey[];
  companyName: string;
  companyWebsite: string;
  size: SizeKey | null;
  countries: CountryKey[];
  tools: ToolsKey | null;
  painPoints: PainKey[];
  modules: ModuleKey[] | null; // null until the prospect edits the recommendation
  slot: string | null;
  timeZone: string;
  meeting: MeetingKey;
  onSiteLocation: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  notes: string;
  consent: boolean;
};

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[13.5px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        active ? "border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/20" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      {active && <Icon.Check size={13} />}
      {children}
    </button>
  );
}

function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[14px] font-medium text-[#0a0f14]">
        {children}
      </label>
      {hint && <span className="font-label text-[11px] text-slate-400">{hint}</span>}
    </div>
  );
}

function DynIcon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  const Cmp = Icon[name];
  return <Cmp size={size} className={className} />;
}

/** Selectable card with crop-mark corners. */
function FrameCard({
  active,
  onClick,
  children,
  className = "",
  pad = "p-4",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  pad?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`corners corners-hover w-full border ${pad} text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        active ? "border-emerald-500 bg-emerald-50/60 text-emerald-600" : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
      } ${className}`}
    >
      <Corners />
      {children}
    </button>
  );
}

function Aside({ form, modules, duration, step }: { form: Form; modules: ModuleKey[]; duration: number; step: number }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/80 bg-white/70 p-5 backdrop-blur">
        <p className="font-label text-[11px] text-emerald-700">ON THE CALL · {duration} MIN</p>
        <ol className="mt-3 space-y-2.5">
          {[
            ["Your workflow, mapped", "Where product, paper and money change hands"],
            ["Your modules, live", "Real screens in your terminology"],
            ["Pilot plan & pricing", "One module, one KPI, 60 days"],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-start gap-3">
              <span className="font-label mt-0.5 text-[11px] text-slate-400">0{i + 1}</span>
              <p className="text-[13.5px] leading-snug text-slate-600">
                <span className="font-medium text-[#0a0f14]">{t}.</span> {d}
              </p>
            </li>
          ))}
        </ol>
      </div>
      {step >= 1 && form.segment && (
        <div className="rise rounded-2xl border border-emerald-200/70 bg-white/80 p-5 backdrop-blur">
          <p className="font-label text-[11px] text-emerald-700">YOUR OFFSHORA</p>
          <p className="font-display mt-2 text-[1.35rem] leading-tight text-[#0a0f14]">{form.companyName || SEGMENTS[form.segment].label}</p>
          {form.companyName && <p className="text-[13px] text-slate-500">{SEGMENTS[form.segment].label}</p>}
          {step >= 2 && modules.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {modules.map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[12px] font-medium text-emerald-800">
                  <DynIcon name={MODULES[m].icon} size={12} /> {MODULES[m].label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BookDemo({ initialSegment }: { initialSegment: SegmentKey | null }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    segment: initialSegment,
    operations: [],
    companyName: "",
    companyWebsite: "",
    size: null,
    countries: ["NG"],
    tools: null,
    painPoints: [],
    modules: null,
    slot: null,
    timeZone: "Africa/Lagos",
    meeting: "google_meet",
    onSiteLocation: "",
    fullName: "",
    email: "",
    phone: "",
    jobTitle: "",
    notes: "",
    consent: false,
  });
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [receipt, setReceipt] = useState<DemoReceipt | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const loadAvailability = useCallback(async () => {
    setAvailabilityError("");
    try {
      setAvailability(await demoApi.availability());
    } catch {
      setAvailabilityError("We couldn't load the calendar. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    // Detected after mount so server and client render the same first frame.
    setForm((f) => ({ ...f, timeZone: detectTimezone() }));
    void loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, receipt]);

  const recommendations = useMemo(
    () => recommendModules({ segment: form.segment, operations: form.operations, painPoints: form.painPoints, size: form.size }),
    [form.segment, form.operations, form.painPoints, form.size],
  );
  const selectedModules: ModuleKey[] = form.modules ?? recommendations.map((r) => r.key);
  const recommendedKeys = new Set(recommendations.map((r) => r.key));
  const otherModules = (Object.keys(MODULES) as ModuleKey[]).filter((k) => !recommendedKeys.has(k));
  const duration = availability?.duration_minutes ?? 45;

  const timezoneOptions = useMemo(() => {
    const list = [...COMMON_TIMEZONES];
    if (!list.some((z) => z.id === form.timeZone)) list.unshift({ id: form.timeZone, label: form.timeZone.replace(/_/g, " ") });
    return list;
  }, [form.timeZone]);

  const canContinue = [
    !!form.segment,
    form.companyName.trim().length > 1 && !!form.size && form.countries.length > 0 && !!form.tools,
    selectedModules.length > 0,
    !!form.slot && (form.meeting !== "on_site" || form.onSiteLocation.trim().length > 1),
    form.fullName.trim().length > 1 && /.+@.+\..+/.test(form.email) && form.phone.trim().length >= 7 && form.jobTitle.trim().length > 1 && form.consent,
  ][step];

  async function submit() {
    if (!form.segment || !form.size || !form.tools || !form.slot) return;
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      const website = form.companyWebsite.trim();
      const result = await demoApi.create({
        segment: form.segment,
        operations: form.operations,
        company_name: form.companyName.trim(),
        company_website: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
        company_size: form.size,
        countries: form.countries,
        pain_points: form.painPoints,
        interested_modules: selectedModules,
        current_tools: form.tools,
        full_name: form.fullName.trim(),
        work_email: form.email.trim(),
        phone: form.phone.trim(),
        job_title: form.jobTitle.trim(),
        notes: form.notes.trim(),
        scheduled_start: form.slot,
        prospect_timezone: form.timeZone,
        meeting_format: form.meeting,
        on_site_location: form.meeting === "on_site" ? form.onSiteLocation.trim() : "",
        consent_to_contact: form.consent,
      });
      setReceipt(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fields);
        if (err.status === 409 || err.fields.scheduled_start) {
          set("slot", null);
          await loadAvailability();
          setStep(3);
        } else if (err.fields.company_website) {
          setStep(1);
        }
        setError(err.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : err.message);
      } else {
        setError("We couldn't reach Offshora. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!canContinue) return;
    setError("");
    if (step === STEPS.length - 1) void submit();
    else setStep((s) => s + 1);
  }

  const fieldError = (name: string) =>
    fieldErrors[name]?.[0] ? <p className="mt-1.5 text-[12.5px] font-medium text-rose-600">{fieldErrors[name][0]}</p> : null;

  return (
    <AuthShell
      eyebrow="Book a demo"
      title={
        <>
          A demo built around <span className="text-emerald-600">your operation.</span>
        </>
      }
      sub="Tell us what you run. We switch on only the modules you need, so your team never wades through screens built for someone else."
      aside={<Aside form={form} modules={selectedModules} duration={duration} step={receipt ? 4 : step} />}
      topLink={{ prompt: "Already a customer?", label: "Sign in", href: "/login" }}
    >
      <div className="mx-auto w-full max-w-[760px] pt-2">
        {receipt ? (
          <Confirmation receipt={receipt} form={form} modules={selectedModules} headingRef={headingRef} />
        ) : (
          <>
            {/* Stepper */}
            <ol className="grid grid-cols-5 gap-2" aria-label="Booking progress">
              {STEPS.map((label, i) => (
                <li key={label}>
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => setStep(i)}
                    aria-current={i === step ? "step" : undefined}
                    className="group w-full text-left disabled:cursor-default focus-visible:outline-none"
                  >
                    <span className="block h-[3px] overflow-hidden rounded-full bg-slate-200">
                      <span className={`block h-full bg-emerald-500 transition-all duration-700 ${i <= step ? "w-full" : "w-0"}`} />
                    </span>
                    <span className={`font-label mt-2.5 block text-[11px] ${i === step ? "text-[#0a0f14]" : i < step ? "text-emerald-700 group-hover:underline" : "text-slate-400"}`}>
                      <span className="opacity-60">0{i + 1}</span>
                      <span className="ml-1.5 hidden sm:inline">{label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div key={step} className="mt-10">
              <h1 ref={headingRef} tabIndex={-1} className="font-display text-[2.35rem] leading-[1.04] text-[#0a0f14] outline-none sm:text-[3rem]">
                <BlurText stagger={45}>{HEADINGS[step].title}</BlurText>
              </h1>
              <Reveal delay={150}>
                <p className="mt-3 max-w-[560px] text-[15.5px] text-slate-600">{HEADINGS[step].sub}</p>
              </Reveal>

              <Reveal delay={250} className="mt-9 space-y-9">
                {step === 0 && (
                  <>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {(Object.keys(SEGMENTS) as SegmentKey[]).map((key) => {
                        const s = SEGMENTS[key];
                        const active = form.segment === key;
                        return (
                          <FrameCard key={key} active={active} onClick={() => set("segment", key)}>
                            <span className="flex items-start gap-3.5">
                              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                                <DynIcon name={s.icon} />
                              </span>
                              <span>
                                <span className="block text-[15px] font-medium text-[#0a0f14]">{s.label}</span>
                                <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{s.hint}</span>
                              </span>
                            </span>
                          </FrameCard>
                        );
                      })}
                    </div>
                    <div>
                      <Label hint="OPTIONAL · PICK ALL THAT APPLY">What else does your company do?</Label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(OPERATIONS) as OperationKey[]).map((key) => (
                          <Chip key={key} active={form.operations.includes(key)} onClick={() => set("operations", toggle(form.operations, key))}>
                            {OPERATIONS[key].label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="company">Company name</Label>
                        <input id="company" className={fieldClass} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Delta Marine Services Ltd" autoComplete="organization" maxLength={200} />
                      </div>
                      <div>
                        <Label htmlFor="website" hint="OPTIONAL">
                          Website
                        </Label>
                        <input id="website" className={fieldClass} value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} placeholder="company.com" inputMode="url" maxLength={300} />
                        {fieldError("company_website")}
                      </div>
                    </div>
                    <div>
                      <Label>How many people work there?</Label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(COMPANY_SIZES) as SizeKey[]).map((key) => (
                          <Chip key={key} active={form.size === key} onClick={() => set("size", key)}>
                            {COMPANY_SIZES[key].label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label hint="PICK ALL THAT APPLY">Where do you operate?</Label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(COUNTRIES) as CountryKey[]).map((key) => (
                          <Chip key={key} active={form.countries.includes(key)} onClick={() => set("countries", toggle(form.countries, key))}>
                            {COUNTRIES[key].label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>How do you run operations today?</Label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(CURRENT_TOOLS) as ToolsKey[]).map((key) => (
                          <Chip key={key} active={form.tools === key} onClick={() => set("tools", key)}>
                            {CURRENT_TOOLS[key].label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label hint="OPTIONAL · PICK ALL THAT APPLY">What costs you the most time or money?</Label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(PAIN_POINTS) as PainKey[]).map((key) => (
                          <Chip key={key} active={form.painPoints.includes(key)} onClick={() => set("painPoints", toggle(form.painPoints, key))}>
                            {PAIN_POINTS[key].label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {recommendations.map(({ key, reasons }, i) => {
                        const m = MODULES[key];
                        const on = selectedModules.includes(key);
                        return (
                          <FrameCard key={key} active={on} onClick={() => set("modules", toggle(selectedModules, key))} className={on ? "" : "opacity-70 hover:opacity-100"}>
                            <span className="flex items-center gap-3">
                              <span className={`grid h-10 w-10 place-items-center rounded-xl transition ${on ? "bg-[#0a0f14] text-emerald-300" : "bg-slate-100 text-slate-500"}`}>
                                <DynIcon name={m.icon} size={18} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="text-[15px] font-medium text-[#0a0f14]">{m.label}</span>
                                  {i < 3 && <span className="font-label rounded bg-emerald-100 px-1.5 py-0.5 text-[9.5px] text-emerald-800">TOP MATCH</span>}
                                </span>
                                <span className="block truncate text-[12.5px] text-slate-500">{m.hint}</span>
                              </span>
                              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"}`}>
                                {on && <Icon.Check size={13} />}
                              </span>
                            </span>
                            <span className="mt-3 flex flex-wrap gap-1">
                              {reasons.slice(0, 2).map((r) => (
                                <span key={r} className="font-label rounded-md bg-white px-2 py-0.5 text-[10.5px] text-slate-600 ring-1 ring-slate-200">
                                  {r}
                                </span>
                              ))}
                            </span>
                          </FrameCard>
                        );
                      })}
                    </div>

                    <details className="group border-y border-slate-200 py-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-medium text-[#0a0f14]">
                        Add another module
                        <span className="text-[22px] font-light leading-none text-slate-500 transition group-open:rotate-45">+</span>
                      </summary>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {otherModules.map((key) => (
                          <Chip key={key} active={selectedModules.includes(key)} onClick={() => set("modules", toggle(selectedModules, key))}>
                            {MODULES[key].label}
                          </Chip>
                        ))}
                      </div>
                    </details>

                    <div className="corners flex items-start gap-3 px-5 py-4 text-slate-400">
                      <Corners />
                      <Icon.Layers size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                      <p className="text-[14px] leading-relaxed text-slate-600">
                        <span className="font-medium text-[#0a0f14]">Every plan includes the core:</span> offline field capture, an audit trail on every record, roles and permissions, and NGN/USD
                        reporting. You pay for the {selectedModules.length} module{selectedModules.length === 1 ? "" : "s"} above, not for the rest.
                      </p>
                    </div>

                    {form.countries.some((c) => c !== "NG") && (
                      <div className="flex items-start gap-3 rounded-xl bg-sky-50 px-5 py-4 text-[14px] leading-relaxed text-sky-900">
                        <Icon.Globe size={18} className="mt-0.5 shrink-0 text-sky-600" />
                        <p>
                          {form.countries.includes("UG")
                            ? "Operating in Uganda? On the call we'll go through your PAU National Supplier Database, NEMA and UGX invoicing requirements, and how your compliance calendar should handle them."
                            : "Operating outside Nigeria? On the call we'll go through your local regulators, currencies and reporting so your setup matches each country."}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <label htmlFor="tz" className="font-label text-[11.5px] text-slate-500">
                        YOUR TIME ZONE
                      </label>
                      <select id="tz" value={form.timeZone} onChange={(e) => set("timeZone", e.target.value)} className="h-10 rounded-full border border-slate-200 bg-white px-4 text-[13.5px] text-[#0a0f14] outline-none focus:border-emerald-500 focus:ring-[4px] focus:ring-emerald-100">
                        {timezoneOptions.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {error && (
                      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
                        {error}
                      </div>
                    )}

                    {availability ? (
                      <SlotPicker slots={availability.slots} timeZone={form.timeZone} value={form.slot} onChange={(iso) => set("slot", iso)} />
                    ) : availabilityError ? (
                      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-[14px] text-rose-700">
                        {availabilityError}
                        <button type="button" onClick={() => void loadAvailability()} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-medium">
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]" aria-busy="true" aria-label="Loading calendar">
                        <div className="h-[360px] animate-pulse rounded-xl bg-slate-100" />
                        <div className="h-[360px] animate-pulse rounded-xl bg-slate-100" />
                      </div>
                    )}

                    <div>
                      <Label>How would you like to meet?</Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {(Object.keys(MEETING_FORMATS) as MeetingKey[]).map((key) => {
                          const active = form.meeting === key;
                          return (
                            <FrameCard key={key} active={active} onClick={() => set("meeting", key)} pad="p-3.5">
                              <span className="flex items-center gap-2.5 text-[14px] text-[#0a0f14]">
                                <DynIcon name={MEETING_FORMATS[key].icon} size={16} className={active ? "text-emerald-600" : "text-slate-400"} />
                                {MEETING_FORMATS[key].label}
                              </span>
                            </FrameCard>
                          );
                        })}
                      </div>
                      {form.meeting === "on_site" && (
                        <div className="mt-4">
                          <Label htmlFor="onsite">Where should we meet you?</Label>
                          <input id="onsite" className={fieldClass} value={form.onSiteLocation} onChange={(e) => set("onSiteLocation", e.target.value)} placeholder="e.g. Trans-Amadi, Port Harcourt" maxLength={120} />
                          {fieldError("on_site_location")}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    {form.slot && (
                      <div className="corners flex items-center gap-4 px-5 py-4 text-slate-400">
                        <Corners />
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0a0f14] text-emerald-300">
                          <Icon.Calendar size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-[1.3rem] leading-tight text-[#0a0f14]">
                            {formatLongDate(form.slot, form.timeZone)} · {formatTime(form.slot, form.timeZone)} {zoneAbbrev(form.slot, form.timeZone)}
                          </p>
                          <p className="font-label mt-1 text-[11.5px] text-slate-500">
                            {MEETING_FORMATS[form.meeting].label.toUpperCase()} · {duration} MIN · {selectedModules.length} MODULE{selectedModules.length === 1 ? "" : "S"}
                          </p>
                        </div>
                        <button type="button" onClick={() => setStep(3)} className="text-[13.5px] font-medium text-emerald-700 underline-offset-4 hover:underline">
                          Change
                        </button>
                      </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="name">Full name</Label>
                        <input id="name" className={fieldClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Adaeze Okafor" autoComplete="name" maxLength={150} />
                        {fieldError("full_name")}
                      </div>
                      <div>
                        <Label htmlFor="title">Job title</Label>
                        <input id="title" className={fieldClass} value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="Operations Manager" autoComplete="organization-title" maxLength={120} />
                        {fieldError("job_title")}
                      </div>
                      <div>
                        <Label htmlFor="email">Work email</Label>
                        <input id="email" type="email" className={fieldClass} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="adaeze@company.com" autoComplete="email" maxLength={254} />
                        {fieldError("work_email")}
                      </div>
                      <div>
                        <Label htmlFor="phone" hint="WHATSAPP IS FINE">
                          Phone
                        </Label>
                        <input id="phone" type="tel" className={fieldClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234 803 000 0000" autoComplete="tel" maxLength={32} />
                        {fieldError("phone")}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="notes" hint="OPTIONAL">
                        Anything we should prepare?
                      </Label>
                      <textarea id="notes" rows={3} className={`${fieldClass} h-auto py-3`} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. We run 14 trucks between Apapa and Ibadan and lose product at offload." maxLength={2000} />
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-slate-600">
                      <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-1 h-[18px] w-[18px] shrink-0 rounded-md accent-emerald-600" />
                      <span>Offshora may contact me by email, phone or WhatsApp about this demo and a possible pilot. We handle your details under the Nigeria Data Protection Act 2023.</span>
                    </label>
                    {error && (
                      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700">
                        {error}
                      </div>
                    )}
                  </>
                )}
              </Reveal>
            </div>

            {/* Footer nav */}
            <div className="mt-12 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="group inline-flex h-12 items-center gap-2 rounded-xl px-3 text-[15px] text-slate-600 transition hover:text-[#0a0f14]">
                  <Icon.Arrow size={16} className="rotate-180 transition group-hover:-translate-x-0.5" /> Back
                </button>
              ) : (
                <span className="font-label text-[11.5px] text-slate-400">ABOUT 2 MINUTES</span>
              )}
              <button
                type="button"
                onClick={next}
                disabled={!canContinue || submitting}
                className="btn-ink group inline-flex h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-medium disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {step === STEPS.length - 1 ? (submitting ? "Booking…" : "Book my demo") : "Continue"}
                <Icon.Arrow size={16} className="transition group-hover:translate-x-0.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  );
}

function Confirmation({
  receipt,
  form,
  modules,
  headingRef,
}: {
  receipt: DemoReceipt;
  form: Form;
  modules: ModuleKey[];
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const icsHref = useMemo(() => `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(receipt, form.companyName))}`, [receipt, form.companyName]);
  const start = receipt.scheduled_start;
  return (
    <div className="pt-6">
      <span className="seal-pop grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
        <Icon.Check size={28} />
      </span>
      <h1 ref={headingRef} tabIndex={-1} className="font-display mt-7 text-[2.6rem] leading-[1.02] text-[#0a0f14] outline-none sm:text-[3.2rem]">
        <BlurText>
          <>
            You&apos;re booked, <span className="text-emerald-600">{form.fullName.split(" ")[0]}.</span>
          </>
        </BlurText>
      </h1>
      <Reveal delay={200}>
        <p className="mt-3 text-[15.5px] text-slate-600">
          A confirmation is on its way to <span className="font-medium text-[#0a0f14]">{form.email}</span>. Your meeting link follows within one business day.
        </p>
      </Reveal>

      <Reveal delay={300} className="corners mt-9 p-2 text-slate-400">
        <Corners />
        <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
          {[
            ["WHEN", formatLongDate(start, form.timeZone), `${formatTime(start, form.timeZone)} ${zoneAbbrev(start, form.timeZone)} · ${receipt.duration_minutes} min`],
            ["HOW", MEETING_FORMATS[form.meeting].label, form.meeting === "on_site" ? form.onSiteLocation : "Link sent by email"],
            ["REFERENCE", receipt.reference, "Quote this to reschedule"],
          ].map(([k, v, s]) => (
            <div key={k} className="bg-white p-5">
              <p className="font-label text-[11px] text-slate-400">{k}</p>
              <p className="font-display mt-2 text-[1.4rem] leading-tight text-[#0a0f14]">{v}</p>
              <p className="mt-1 text-[13px] text-slate-500">{s}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={400} className="mt-6 flex flex-wrap items-center gap-3">
        <a href={icsHref} download={`offshora-demo-${receipt.reference}.ics`} className="cta-block inline-flex text-[14.5px]">
          <span className="arrow">
            <Icon.Calendar size={16} />
          </span>
          <span className="text-[#0a0f14]">Add to calendar</span>
        </a>
        <Link href="/" className="inline-flex h-12 items-center rounded-xl px-4 text-[14.5px] text-slate-600 transition hover:text-[#0a0f14]">
          Back to Offshora
        </Link>
      </Reveal>

      <Reveal delay={500} className="mt-12">
        <p className="font-label text-[11.5px] text-slate-500">WHAT WE&apos;LL PREPARE FOR {form.companyName.toUpperCase()}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {modules.map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[13px] text-emerald-900">
              <DynIcon name={MODULES[m].icon} size={14} className="text-emerald-600" /> {MODULES[m].label}
            </span>
          ))}
        </div>
        <ol className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {[
            ["Within one business day", "We confirm the slot and send your meeting link."],
            ["Before the call", "We set up a sandbox with your modules and your terminology."],
            ["After the call", "If it fits, we agree one KPI and start a 60-day pilot."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4 py-4">
              <span className="font-label pt-0.5 text-[11.5px] text-emerald-700">0{i + 1}</span>
              <p className="text-[14.5px] text-slate-600">
                <span className="font-medium text-[#0a0f14]">{t}.</span> {d}
              </p>
            </li>
          ))}
        </ol>
      </Reveal>
    </div>
  );
}
