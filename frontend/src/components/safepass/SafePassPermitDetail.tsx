"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, SafePassPermit, SafePassWorker, downloadSafePassPermit, safePassApi } from "@/lib/api";

type FormMode = "gas" | "ack-jsa" | "ack-toolbox" | "transition" | null;

const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const text = (item: string) => item.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const actionLabels: Record<string, string> = {
  submit: "Submit for review",
  approve: "Approve permit",
  activate: "Activate permit",
  suspend: "Suspend work",
  resume: "Resume work",
  close: "Close permit",
  reject: "Reject permit",
  cancel: "Cancel permit",
};

export function SafePassPermitDetail({ id }: { id: string }) {
  const [permit, setPermit] = useState<SafePassPermit | null>(null);
  const [workers, setWorkers] = useState<SafePassWorker[]>([]);
  const [mode, setMode] = useState<FormMode>(null);
  const [transitionAction, setTransitionAction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    try {
      const [record, people] = await Promise.all([safePassApi.permit(id), safePassApi.workers()]);
      setPermit(record);
      setWorkers(people);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("The permit could not be loaded.", 0));
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function openTransition(action: string) {
    setTransitionAction(action);
    setMode("transition");
    setError(null);
  }

  async function submitTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permit || !transitionAction) return;
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await safePassApi.transition(id, transitionAction, permit.version, value(data, "reason"));
      setMode(null);
      setTransitionAction(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("The permit action failed.", 0));
    } finally {
      setBusy(false);
    }
  }

  async function submitSafetyRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "gas") {
        await safePassApi.gasTest(id, {
          tested_at: new Date(value(data, "tested_at")).toISOString(),
          oxygen_percent: value(data, "oxygen_percent"),
          lel_percent: value(data, "lel_percent"),
          h2s_ppm: value(data, "h2s_ppm"),
          instrument_reference: value(data, "instrument_reference"),
          instrument_calibration_expires_on: value(data, "instrument_calibration_expires_on"),
        });
      } else if (mode === "ack-jsa" || mode === "ack-toolbox") {
        await safePassApi.acknowledge(id, {
          worker_id: value(data, "worker_id"),
          kind: mode === "ack-jsa" ? "jsa" : "toolbox",
          acknowledged_at: new Date().toISOString(),
          statement: value(data, "statement"),
        });
      }
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("The safety record could not be saved.", 0));
    } finally {
      setBusy(false);
    }
  }

  async function exportPermit() {
    if (!permit) return;
    setBusy(true);
    setError(null);
    try {
      await downloadSafePassPermit(id, permit.reference);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("The permit PDF could not be exported.", 0));
    } finally {
      setBusy(false);
    }
  }

  if (!permit) {
    return <div className="rounded-[28px] bg-white p-12 text-center text-slate-500">{error?.message ?? "Loading permit…"}</div>;
  }

  const latest = permit.gas_tests.at(-1);
  const hasJsa = permit.acknowledgements.some((item) => item.kind === "jsa");
  const hasToolbox = permit.acknowledgements.some((item) => item.kind === "toolbox");
  const next = permit.status === "draft"
    ? { label: "Submit for review", action: "submit" }
    : permit.status === "under_review" && (!latest || !latest.passed)
      ? { label: latest ? "Record a passing gas test" : "Record gas test", mode: "gas" as FormMode }
      : permit.status === "under_review" && !hasJsa
        ? { label: "Record JSA acknowledgement", mode: "ack-jsa" as FormMode }
        : permit.status === "under_review" && !hasToolbox
          ? { label: "Record toolbox-talk acknowledgement", mode: "ack-toolbox" as FormMode }
          : permit.status === "under_review"
            ? { label: "Approve permit", action: "approve" }
            : permit.status === "approved"
              ? { label: "Activate permit", action: "activate" }
              : permit.status === "active"
                ? { label: "Close permit", action: "close" }
                : permit.status === "suspended"
                  ? { label: "Resume work", action: "resume" }
                  : null;

  return <div className="mx-auto max-w-[1200px] space-y-5">
    <header>
      <Link href="/dashboard/safe-pass" className="text-sm font-semibold text-sky-700">← SafePass</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-sm font-bold text-slate-600">{permit.reference}</p><h1 className="mt-1 text-3xl font-bold text-slate-950">{permit.title}</h1><p className="mt-1 text-sm text-slate-500">{permit.site} · {permit.performing_authority_name}</p></div>
        <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">{text(permit.status)}</span>
      </div>
    </header>

    {error && <ErrorNotice error={error} />}

    {next && <section className="flex flex-col gap-4 rounded-[24px] bg-[#0b1523] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-400">Next required action</p><h2 className="mt-2 text-xl font-bold">{next.label}</h2><p className="mt-1 text-sm text-slate-300">SafePass keeps the permit blocked until the required evidence and approval are complete.</p></div>
      <button disabled={busy} onClick={() => next.mode ? setMode(next.mode) : next.action && openTransition(next.action)} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{next.label}</button>
    </section>}

    {mode === "transition" && transitionAction && <form onSubmit={submitTransition} className="rounded-[24px] border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">Controlled transition</p><h2 className="mt-1 text-lg font-bold">{actionLabels[transitionAction]}</h2><p className="mt-1 text-sm text-slate-500">The reason is stored in the immutable audit history.</p></div><button type="button" onClick={() => { setMode(null); setTransitionAction(null); }} className="text-sm font-semibold text-slate-500">Cancel</button></div>
      <label className="mt-5 block text-xs font-semibold text-slate-700">Reason<textarea name="reason" rows={3} required minLength={5} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="Record the operational basis for this action." /></label>
      <div className="mt-5 flex justify-end"><button disabled={busy} className="rounded-xl bg-[#0b1523] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : actionLabels[transitionAction]}</button></div>
    </form>}

    {(mode === "gas" || mode === "ack-jsa" || mode === "ack-toolbox") && <form onSubmit={submitSafetyRecord} className="rounded-[24px] bg-white p-6">
      <div className="flex justify-between gap-4"><div><h2 className="text-lg font-bold">{mode === "gas" ? "Atmospheric gas test" : mode === "ack-jsa" ? "JSA acknowledgement" : "Toolbox-talk acknowledgement"}</h2><p className="mt-1 text-sm text-slate-500">{mode === "gas" ? "Enter the observed instrument reading. SafePass evaluates it against the approved procedure." : "Record who acknowledged the safety briefing and what they accepted."}</p></div><button type="button" onClick={() => setMode(null)} className="text-sm font-semibold text-slate-500">Cancel</button></div>
      {mode === "gas" ? <div className="mt-5 grid gap-4 md:grid-cols-3"><Input name="tested_at" label="Tested at" type="datetime-local" required /><Input name="oxygen_percent" label="O₂ (%)" type="number" step=".01" min="0" required /><Input name="lel_percent" label="LEL (%)" type="number" step=".01" min="0" required /><Input name="h2s_ppm" label="H₂S (ppm)" type="number" step=".01" min="0" required /><Input name="instrument_reference" label="Instrument reference" required /><Input name="instrument_calibration_expires_on" label="Calibration expires" type="date" required /></div> : <div className="mt-5 grid gap-4 md:grid-cols-2"><Select name="worker_id" label="Worker" items={workers.map((item) => [item.id, `${item.employee_number} · ${item.full_name}`])} /><Input name="statement" label="Acknowledgement statement" required /></div>}
      <div className="mt-5 flex justify-end"><button disabled={busy} className="rounded-xl bg-[#0b1523] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save safety record"}</button></div>
    </form>}

    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[24px] bg-white p-6"><h2 className="font-bold">Permit scope</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><Item term="Type" detail={text(permit.kind)} /><Item term="Procedure" detail={permit.procedure_name} /><Item term="Starts" detail={new Date(permit.starts_at).toLocaleString()} /><Item term="Expires" detail={new Date(permit.expires_at).toLocaleString()} /></dl><p className="mt-5 text-sm text-slate-600">{permit.work_description}</p><ScopeList title="Hazards" items={permit.hazards} /><ScopeList title="Controls" items={permit.controls} /></article>
      <article className="rounded-[24px] bg-white p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Safety gate</h2>{["approved", "active", "suspended", "closed"].includes(permit.status) && <button disabled={busy} onClick={() => void exportPermit()} className="text-xs font-bold text-sky-700 disabled:opacity-50">Export PDF</button>}</div><div className="mt-4 space-y-3"><Check ok={Boolean(latest?.passed)} text={latest ? `Gas test ${latest.passed ? "passed" : "blocked"}: O₂ ${latest.oxygen_percent}% · LEL ${latest.lel_percent}% · H₂S ${latest.h2s_ppm} ppm` : "Passing gas test required"} /><Check ok={hasJsa} text="JSA acknowledgement" /><Check ok={hasToolbox} text="Toolbox-talk acknowledgement" /></div><div className="mt-5 flex flex-wrap gap-2">{permit.status === "draft" && <SecondaryAction danger label="Cancel permit" onClick={() => openTransition("cancel")} />}{permit.status === "under_review" && <SecondaryAction danger label="Reject permit" onClick={() => openTransition("reject")} />}{permit.status === "active" && <SecondaryAction danger label="Suspend work" onClick={() => openTransition("suspend")} />}</div></article>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[24px] bg-white p-6"><h2 className="font-bold">Gas-test history</h2><div className="mt-4 space-y-3">{permit.gas_tests.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{item.instrument_reference}</p><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{item.passed ? "Passed" : "Failed"}</span></div><p className="mt-1 text-xs text-slate-500">{new Date(item.tested_at).toLocaleString()} · O₂ {item.oxygen_percent}% · LEL {item.lel_percent}% · H₂S {item.h2s_ppm} ppm</p></div>)}{!permit.gas_tests.length && <EmptyState text="No gas tests recorded." />}</div></article>
      <article className="rounded-[24px] bg-white p-6"><h2 className="font-bold">Safety acknowledgements</h2><div className="mt-4 space-y-3">{permit.acknowledgements.map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-4"><p className="text-sm font-bold">{text(item.kind)} · {item.worker_name}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.acknowledged_at).toLocaleString()}</p><p className="mt-2 text-sm text-slate-600">{item.statement}</p></div>)}{!permit.acknowledgements.length && <EmptyState text="No acknowledgements recorded." />}</div></article>
    </section>

    <section className="rounded-[24px] bg-white p-6"><h2 className="font-bold">Immutable audit history</h2><div className="mt-4 space-y-4">{permit.audit_events.map((item) => <div key={item.id} className="border-l-2 border-emerald-400 pl-4"><p className="text-sm font-bold">{text(item.action)}</p><p className="text-xs text-slate-500">{item.actor} · {new Date(item.created_at).toLocaleString()}</p>{item.reason && <p className="mt-1 text-sm text-slate-600">{item.reason}</p>}</div>)}</div></section>
  </div>;
}

function ErrorNotice({ error }: { error: ApiError }) { return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="font-bold text-rose-950">We couldn’t complete that SafePass action</p><p className="mt-1 text-sm text-rose-800">{error.message}</p>{Object.entries(error.fields).map(([key, messages]) => <p key={key} className="mt-1 text-xs text-rose-700"><b>{text(key)}:</b> {messages.join(" ")}</p>)}</div>; }
function Item({ term, detail }: { term: string; detail: string }) { return <div><dt className="text-xs font-semibold text-slate-400">{term}</dt><dd className="mt-1 font-semibold text-slate-800">{detail}</dd></div>; }
function Check({ ok, text: message }: { ok: boolean; text: string }) { return <div className={`rounded-xl px-4 py-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{ok ? "✓" : "○"} {message}</div>; }
function ScopeList({ title, items }: { title: string; items: string[] }) { return <div className="mt-5"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">{title}</h3><ul className="mt-2 space-y-1 text-sm text-slate-600">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>; }
function SecondaryAction({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) { return <button type="button" onClick={onClick} className={`rounded-xl border px-4 py-2 text-xs font-bold ${danger ? "border-rose-200 text-rose-700" : "border-slate-200 text-slate-700"}`}>{label}</button>; }
function EmptyState({ text: message }: { text: string }) { return <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">{message}</p>; }
function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label, ...input } = props; return <label className="text-xs font-semibold text-slate-700">{label}<input {...input} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>; }
function Select({ name, label, items }: { name: string; label: string; items: string[][] }) { return <label className="text-xs font-semibold text-slate-700">{label}<select name={name} required defaultValue="" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="" disabled>Select {label.toLowerCase()}</option>{items.map(([itemValue, itemName]) => <option key={itemValue} value={itemValue}>{itemName}</option>)}</select></label>; }
