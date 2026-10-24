"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, SafePassCredential, SafePassMobilization, SafePassPermit, SafePassProcedure, SafePassSummary, SafePassWorker, safePassApi } from "@/lib/api";

type CreateMode = "worker" | "procedure" | "credential" | "mobilization" | "permit" | null;
const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function SafePassDashboard() {
  const [summary, setSummary] = useState<SafePassSummary | null>(null);
  const [workers, setWorkers] = useState<SafePassWorker[]>([]);
  const [credentials, setCredentials] = useState<SafePassCredential[]>([]);
  const [procedures, setProcedures] = useState<SafePassProcedure[]>([]);
  const [mobilizations, setMobilizations] = useState<SafePassMobilization[]>([]);
  const [permits, setPermits] = useState<SafePassPermit[]>([]);
  const [mode, setMode] = useState<CreateMode>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    try {
      const [totals, people, certs, rules, manifests, work] = await Promise.all([safePassApi.summary(), safePassApi.workers(), safePassApi.credentials(), safePassApi.procedures(), safePassApi.mobilizations(), safePassApi.permits()]);
      setSummary(totals); setWorkers(people); setCredentials(certs); setProcedures(rules); setMobilizations(manifests); setPermits(work); setError(null);
    } catch (caught) { setError(caught instanceof ApiError ? caught : new ApiError("SafePass could not be loaded.", 0)); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); const data = new FormData(event.currentTarget);
    try {
      if (mode === "worker") await safePassApi.createWorker({ employee_number: field(data, "employee_number"), full_name: field(data, "full_name"), job_title: field(data, "job_title"), email: field(data, "email"), phone_number: field(data, "phone_number") });
      if (mode === "procedure") { const item = await safePassApi.createProcedure({ name: field(data, "name"), site: field(data, "site"), credential_buffer_days: 30, oxygen_min_percent: field(data, "oxygen_min_percent"), oxygen_max_percent: field(data, "oxygen_max_percent"), max_lel_percent: field(data, "max_lel_percent"), max_h2s_ppm: field(data, "max_h2s_ppm"), required_credential_kinds: data.getAll("required_credentials") }); await safePassApi.approveProcedure(item.id); }
      if (mode === "credential") await safePassApi.createCredential({ worker_id: field(data, "worker_id"), kind: field(data, "kind"), certificate_number: field(data, "certificate_number"), issuer: field(data, "issuer"), valid_from: field(data, "valid_from"), expires_on: field(data, "expires_on"), evidence_reference: field(data, "evidence_reference") });
      if (mode === "mobilization") { const item = await safePassApi.createMobilization({ destination: field(data, "destination"), scheduled_at: new Date(field(data, "scheduled_at")).toISOString(), procedure_id: field(data, "procedure_id") }); await safePassApi.addCrew(item.id, field(data, "worker_id")); }
      if (mode === "permit") await safePassApi.createPermit({ kind: field(data, "kind"), title: field(data, "title"), site: field(data, "site"), work_description: field(data, "work_description"), procedure_id: field(data, "procedure_id"), performing_authority_id: field(data, "worker_id"), starts_at: new Date(field(data, "starts_at")).toISOString(), expires_at: new Date(field(data, "expires_at")).toISOString(), hazards: field(data, "hazards").split("\n").filter(Boolean), controls: field(data, "controls").split("\n").filter(Boolean) });
      setMode(null); await load();
    } catch (caught) { setError(caught instanceof ApiError ? caught : new ApiError("This SafePass record could not be saved.", 0)); }
    finally { setSaving(false); }
  }

  const metrics = [["Active workers", summary?.active_workers ?? "—", "Available workforce"], ["Active permits", summary?.active_permits ?? "—", "Controlled work"], ["Mobilizations", summary?.open_mobilizations ?? "—", "Awaiting resolution"], ["Credential alerts", summary?.credential_alerts ?? "—", "Expired or unverified"]];
  return <div className="mx-auto max-w-[1400px] space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[13px] font-semibold text-emerald-700">SafePass</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">Workforce safety control</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Verify mobilization readiness and control Permit-to-Work against approved site procedures.</p></div><button onClick={() => setMode(!workers.length ? "worker" : !procedures.some((item) => item.is_approved) ? "procedure" : "permit")} className="h-11 rounded-full bg-[#0b1523] px-5 text-sm font-semibold text-white">+ New safety record</button></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([name, value, note]) => <article key={name} className="rounded-[24px] bg-white p-5"><p className="text-sm text-slate-500">{name}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>)}</section>
    {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="font-bold text-rose-950">We couldn’t complete that SafePass action</p><p className="mt-1 text-sm text-rose-800">{error.message}</p>{Object.entries(error.fields).map(([key, messages]) => <p key={key} className="mt-1 text-xs text-rose-700"><b>{label(key)}:</b> {messages.join(" ")}</p>)}</div>}
    {mode ? <CreatePanel mode={mode} workers={workers} procedures={procedures.filter((item) => item.is_approved)} saving={saving} onMode={setMode} onSubmit={submit} /> : <DashboardRecords workers={workers} credentials={credentials} procedures={procedures} mobilizations={mobilizations} permits={permits} onMode={setMode} reload={load} setError={setError} />}
  </div>;
}

function CreatePanel({ mode, workers, procedures, saving, onMode, onSubmit }: { mode: Exclude<CreateMode, null>; workers: SafePassWorker[]; procedures: SafePassProcedure[]; saving: boolean; onMode: (value: CreateMode) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const modes: Exclude<CreateMode, null>[] = ["worker", "procedure", "credential", "mobilization", "permit"];
  return <section className="overflow-hidden rounded-[28px] bg-white"><div className="border-b border-slate-100 p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">New safety record</p><h2 className="mt-1 text-xl font-bold">{label(mode)}</h2></div><button onClick={() => onMode(null)} className="text-sm font-semibold text-slate-500">Cancel</button></div><div className="mt-5 flex flex-wrap gap-2">{modes.map((item) => <button key={item} type="button" onClick={() => onMode(item)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item === mode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{label(item)}</button>)}</div></div><form onSubmit={onSubmit} className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-3">
    {mode === "worker" && <><Input name="employee_number" label="Employee number" required /><Input name="full_name" label="Full name" required /><Input name="job_title" label="Job title" required /><Input name="email" label="Work email" type="email" /><Input name="phone_number" label="Phone number" /></>}
    {mode === "procedure" && <><Input name="name" label="Procedure name" required /><Input name="site" label="Site or installation" required /><Input name="oxygen_min_percent" label="Minimum O₂ (%)" type="number" step=".01" required /><Input name="oxygen_max_percent" label="Maximum O₂ (%)" type="number" step=".01" required /><Input name="max_lel_percent" label="Maximum LEL (%)" type="number" step=".01" required /><Input name="max_h2s_ppm" label="Maximum H₂S (ppm)" type="number" step=".01" required /><fieldset className="md:col-span-2 lg:col-span-3"><legend className="text-xs font-semibold">Required credentials</legend><div className="mt-2 flex flex-wrap gap-4">{["bosiet", "huet", "osp", "stcw", "medical"].map((item) => <label key={item} className="flex gap-2 text-sm"><input type="checkbox" name="required_credentials" value={item} />{item.toUpperCase()}</label>)}</div></fieldset><p className="text-xs text-amber-700 md:col-span-2 lg:col-span-3">Use only limits from an approved site procedure. Owners and administrators approve this pilot procedure when saving.</p></>}
    {mode === "credential" && <><Select name="worker_id" label="Worker" items={workers.map((item) => [item.id, `${item.employee_number} · ${item.full_name}`])} /><Select name="kind" label="Credential" items={["bosiet", "huet", "osp", "stcw", "medical"].map((item) => [item, item.toUpperCase()])} /><Input name="certificate_number" label="Certificate number" required /><Input name="issuer" label="Issuer" required /><Input name="valid_from" label="Valid from" type="date" required /><Input name="expires_on" label="Expires on" type="date" required /><Input name="evidence_reference" label="Private vault ID (optional)" placeholder="Example: certificates/2026/abc123" /></>}
    {mode === "mobilization" && <><Input name="destination" label="Destination" required /><Input name="scheduled_at" label="Scheduled date" type="datetime-local" required /><Select name="procedure_id" label="Approved procedure" items={procedures.map((item) => [item.id, item.name])} /><Select name="worker_id" label="First crew member" items={workers.map((item) => [item.id, item.full_name])} /></>}
    {mode === "permit" && <><Select name="kind" label="Permit type" items={[["hot_work", "Hot work"], ["confined_space", "Confined space"], ["working_at_height", "Working at height"], ["excavation", "Excavation"]]} /><Input name="title" label="Work title" required /><Input name="site" label="Work area" required /><Select name="procedure_id" label="Approved procedure" items={procedures.map((item) => [item.id, item.name])} /><Select name="worker_id" label="Performing authority" items={workers.map((item) => [item.id, item.full_name])} /><Input name="starts_at" label="Starts at" type="datetime-local" required /><Input name="expires_at" label="Expires at" type="datetime-local" required /><Text name="work_description" label="Work description" /><Text name="hazards" label="Hazards (one per line)" /><Text name="controls" label="Controls (one per line)" /></>}
    <div className="flex justify-end border-t border-slate-100 pt-5 md:col-span-2 lg:col-span-3"><button disabled={saving || ((mode === "permit" || mode === "mobilization") && (!workers.length || !procedures.length))} className="rounded-xl bg-[#0b1523] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{saving ? "Saving…" : `Save ${mode}`}</button></div>
  </form></section>;
}

function DashboardRecords({ workers, credentials, procedures, mobilizations, permits, onMode, reload, setError }: { workers: SafePassWorker[]; credentials: SafePassCredential[]; procedures: SafePassProcedure[]; mobilizations: SafePassMobilization[]; permits: SafePassPermit[]; onMode: (mode: CreateMode) => void; reload: () => Promise<void>; setError: (error: ApiError | null) => void }) {
  const [crewTarget, setCrewTarget] = useState<string | null>(null);
  const [addingCrew, setAddingCrew] = useState(false);
  async function act(action: () => Promise<unknown>) { try { await action(); await reload(); } catch (caught) { setError(caught instanceof ApiError ? caught : new ApiError("The action could not be completed.", 0)); } }
  async function addCrew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!crewTarget) return;
    setAddingCrew(true);
    setError(null);
    try {
      const data = new FormData(event.currentTarget);
      await safePassApi.addCrew(crewTarget, field(data, "worker_id"));
      setCrewTarget(null);
      await reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("The crew member could not be added.", 0));
    } finally {
      setAddingCrew(false);
    }
  }
  const selectedMobilization = mobilizations.find((item) => item.id === crewTarget);
  const availableCrew = workers.filter((worker) => !selectedMobilization?.crew_entries.some((entry) => entry.worker_id === worker.id));
  return <div className="grid gap-4 lg:grid-cols-2"><Queue title="Workforce readiness" button="Add worker" onClick={() => onMode("worker")}><div className="flex gap-2 px-4 py-3"><button onClick={() => onMode("credential")} className="rounded-lg border px-3 py-2 text-xs font-bold">Add credential</button><button onClick={() => onMode("procedure")} className="rounded-lg border px-3 py-2 text-xs font-bold">Define procedure</button></div>{workers.map((item) => <Row key={item.id} name={`${item.employee_number} · ${item.full_name}`} note={item.job_title} state="active" />)}{credentials.map((item) => <Row key={item.id} name={`${item.kind.toUpperCase()} · ${item.worker_name}`} note={`${item.certificate_number} · expires ${item.expires_on}`} state={item.status} action={item.status === "pending" ? <button onClick={() => act(() => safePassApi.verifyCredential(item.id))} className="text-xs font-bold text-sky-700">Verify</button> : undefined} />)}{procedures.map((item) => <Row key={item.id} name={item.name} note={`${item.site} · ${item.credential_buffer_days}-day credential buffer`} state={item.is_approved ? "approved" : "pending"} />)}{!workers.length && <Empty text="Register a worker to begin." />}</Queue>
    <Queue title="Mobilization readiness" button="New mobilization" onClick={() => onMode("mobilization")}>
      {mobilizations.map((item) => {
        const canEditCrew = ["draft", "blocked"].includes(item.status);
        const hasAvailableCrew = workers.some((worker) => !item.crew_entries.some((entry) => entry.worker_id === worker.id));
        return <Row key={item.id} name={item.reference} note={`${item.destination} · ${item.crew_entries.length} crew`} state={item.status} action={<div className="flex items-center gap-3">{canEditCrew && hasAvailableCrew && <button onClick={() => setCrewTarget(item.id)} className="text-xs font-bold text-slate-700">Add crew</button>}{item.status === "ready" ? <button onClick={() => act(() => safePassApi.releaseMobilization(item.id, item.version, "Crew readiness verified"))} className="text-xs font-bold text-emerald-700">Release</button> : item.status !== "released" ? <button onClick={() => act(() => safePassApi.assessMobilization(item.id, item.version))} className="text-xs font-bold text-sky-700">Assess</button> : undefined}</div>} />;
      })}
      {selectedMobilization && <form onSubmit={addCrew} className="bg-slate-50 px-5 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Select name="worker_id" label={`Add crew to ${selectedMobilization.reference}`} items={availableCrew.map((item) => [item.id, `${item.employee_number} · ${item.full_name}`])} /></div><button disabled={addingCrew || !availableCrew.length} className="h-11 rounded-xl bg-[#0b1523] px-4 text-xs font-bold text-white disabled:opacity-40">{addingCrew ? "Adding…" : "Add crew member"}</button><button type="button" onClick={() => setCrewTarget(null)} className="h-11 px-2 text-xs font-bold text-slate-500">Cancel</button></div></form>}
      {!mobilizations.length && <Empty text="No mobilizations yet." />}
    </Queue>
    <div className="lg:col-span-2"><Queue title="Permit-to-Work ledger" button="New permit" onClick={() => onMode("permit")}>{permits.map((item) => <Row key={item.id} name={<Link href={`/dashboard/safe-pass/${item.id}`} className="text-sky-800 hover:underline">{item.reference} · {item.title}</Link>} note={`${item.performing_authority_name} · ${item.site}`} state={item.status} action={<Link href={`/dashboard/safe-pass/${item.id}`} className="text-xs font-bold text-sky-700">Open</Link>} />)}{!permits.length && <Empty text="No controlled work permits yet." />}</Queue></div>
  </div>;
}

function Queue({ title, button, onClick, children }: { title: string; button: string; onClick: () => void; children: React.ReactNode }) { return <section className="overflow-hidden rounded-[28px] bg-white"><div className="flex items-center justify-between border-b p-5"><h2 className="font-bold">{title}</h2><button onClick={onClick} className="rounded-xl bg-[#0b1523] px-4 py-2 text-xs font-semibold text-white">+ {button}</button></div><div className="divide-y">{children}</div></section>; }
function Row({ name, note, state, action }: { name: React.ReactNode; note: string; state: string; action?: React.ReactNode }) { const warning = ["blocked", "rejected", "revoked"].includes(state); const good = ["verified", "active", "approved", "ready"].includes(state); return <div className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${warning ? "bg-rose-50 text-rose-700" : good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{label(state)}</span>{action}</div></div>; }
function Empty({ text }: { text: string }) { return <p className="p-8 text-center text-sm text-slate-500">{text}</p>; }
function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label: text, ...input } = props; return <label className="text-xs font-semibold text-slate-700">{text}<input {...input} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>; }
function Text({ name, label: text }: { name: string; label: string }) { return <label className="text-xs font-semibold text-slate-700">{text}<textarea name={name} rows={3} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>; }
function Select({ name, label: text, items }: { name: string; label: string; items: string[][] }) { return <label className="text-xs font-semibold text-slate-700">{text}<select name={name} required defaultValue="" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="" disabled>Select {text.toLowerCase()}</option>{items.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>; }
