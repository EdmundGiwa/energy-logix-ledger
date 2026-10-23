"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError, BunkerNomination, BunkerSounding, bunkerApi, downloadBdn } from "@/lib/api";
import { Status } from "./BunkerFlowList";
import { WorkflowActionDialog, type WorkflowDialogAction } from "./WorkflowActionDialog";

const steps = ["draft", "confirmed", "sounding_recorded", "bdn_draft", "under_review", "approved", "issued"];
const workflowDialogCopy: Record<string, WorkflowDialogAction> = {
  confirm: { key: "confirm", title: "Confirm this nomination?", description: "This locks the nomination details and opens the pre-delivery sounding stage.", reasonLabel: "Confirmation note", confirmLabel: "Confirm nomination" },
  submit_review: { key: "submit_review", title: "Send this BDN for approval?", description: "Draft editing will close while an owner or administrator reviews the delivery note.", reasonLabel: "Review handoff note", confirmLabel: "Submit for approval" },
  approve: { key: "approve", title: "Approve this BDN?", description: "Confirm that the quantity, fuel properties, acknowledgements, and supporting sounding records are ready for final issue.", reasonLabel: "Approval note", confirmLabel: "Approve BDN" },
  issue: { key: "issue", title: "Issue the final BDN?", description: "Issuance is permanent. The BDN becomes read-only and available as the official PDF export.", reasonLabel: "Issuance note", confirmLabel: "Issue final BDN" },
  cancel: { key: "cancel", title: "Cancel this nomination?", description: "The workflow will close and cannot continue to BDN issuance.", reasonLabel: "Cancellation reason", confirmLabel: "Cancel nomination", destructive: true },
  review_sounding: { key: "review_sounding", title: "Complete the sounding review?", description: "Confirm that the entered measurements and reviewed result match the referenced calculation worksheet.", reasonLabel: "Independent review note", confirmLabel: "Complete review" },
};

type PendingAction =
  | { kind: "transition"; action: string }
  | { kind: "review_sounding"; soundingId: string; version: number };

function field(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function title(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function localDate(value?: string | null) { return value ? new Date(value).toLocaleString() : "—"; }

export function BunkerFlowDetail() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<BunkerNomination | null>(null);
  const [mode, setMode] = useState<"" | "sounding" | "bdn" | "edit_bdn">("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const load = useCallback(async () => {
    setError("");
    try { setRecord(await bunkerApi.detail(id)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "This BunkerFlow record could not be loaded."); }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function completePendingAction(reason: string) {
    if (!record || !pendingAction) return;
    setBusy(true); setError("");
    try {
      if (pendingAction.kind === "transition") {
        setRecord(await bunkerApi.transition(record.id, pendingAction.action, record.version, reason));
      } else {
        setRecord(await bunkerApi.reviewSounding(id, pendingAction.soundingId, pendingAction.version, reason));
      }
      setPendingAction(null);
    }
    catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The workflow action could not be completed.");
      setPendingAction(null);
    }
    finally { setBusy(false); }
  }

  async function createSounding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await bunkerApi.createSounding(id, {
        tank_reference: field(form, "tank_reference"), forward_sounding_m: field(form, "forward_sounding_m"),
        aft_sounding_m: field(form, "aft_sounding_m"), observed_volume_m3: field(form, "observed_volume_m3"),
        observed_temperature_c: field(form, "observed_temperature_c"), density_kg_m3: field(form, "density_kg_m3"),
        reviewed_volume_m3: field(form, "reviewed_volume_m3"), reviewed_mass_mt: field(form, "reviewed_mass_mt"),
        calculation_method_note: field(form, "calculation_method_note"),
      });
      setMode(""); await load();
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "The sounding could not be saved."); }
    finally { setBusy(false); }
  }

  async function saveBdn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      number: field(form, "number"), delivered_quantity_mt: field(form, "delivered_quantity_mt"),
      flashpoint_c: field(form, "flashpoint_c"), viscosity_cst: field(form, "viscosity_cst"),
      sulphur_percent: field(form, "sulphur_percent"), water_percent: field(form, "water_percent"),
      supplier_acknowledged_by: field(form, "supplier_acknowledged_by"),
      supplier_acknowledged_at: field(form, "supplier_acknowledged_at") ? new Date(field(form, "supplier_acknowledged_at")).toISOString() : null,
      receiver_acknowledged_by: field(form, "receiver_acknowledged_by"),
      receiver_acknowledged_at: field(form, "receiver_acknowledged_at") ? new Date(field(form, "receiver_acknowledged_at")).toISOString() : null,
      version: mode === "edit_bdn" ? record.bdn?.version : record.version,
    };
    try {
      setRecord(mode === "edit_bdn" ? await bunkerApi.updateBdn(id, payload) : await bunkerApi.createBdn(id, payload));
      setMode("");
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "The BDN could not be saved."); }
    finally { setBusy(false); }
  }

  if (!record && !error) return <div className="rounded-[28px] bg-white p-12 text-center text-sm text-slate-500">Loading nomination…</div>;
  if (!record) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800">{error}</div>;
  const allowed = new Set(record.allowed_actions ?? []);
  const draftSoundings = (record.soundings ?? []).filter((sounding) => sounding.status === "draft");
  const reviewedSoundings = (record.soundings ?? []).filter((sounding) => sounding.status === "reviewed");
  const dialogAction = pendingAction ? workflowDialogCopy[pendingAction.kind === "transition" ? pendingAction.action : "review_sounding"] : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/dashboard/bunkerflow" className="text-xs font-semibold text-sky-700 hover:underline">← BunkerFlow</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="font-mono text-2xl font-bold text-slate-950">{record.reference}</h1><Status value={record.status} /></div>
          <p className="mt-1 text-sm text-slate-500">{record.vessel_name} · {record.product_grade} · {record.port}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowed.has("export") && record.bdn && <Action primary onClick={() => downloadBdn(record.id, record.bdn!.number).catch(() => setError("The BDN could not be exported."))}>Export PDF</Action>}
          {allowed.has("cancel") && <Action danger disabled={busy} onClick={() => setPendingAction({ kind: "transition", action: "cancel" })}>Cancel nomination</Action>}
        </div>
      </header>

      <section aria-label="Workflow progress" className="overflow-x-auto rounded-[24px] bg-white p-5">
        <ol className="flex min-w-[760px] items-center">
          {steps.map((step, index) => { const current = steps.indexOf(record.status); const complete = current >= index; return <li key={step} className="flex flex-1 items-center last:flex-none"><span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${complete ? "bg-sky-700 text-white" : "bg-slate-100 text-slate-400"}`}>{complete && current > index ? "✓" : index + 1}</span><span className={`ml-2 text-xs font-semibold ${complete ? "text-slate-800" : "text-slate-400"}`}>{step === "sounding_recorded" ? "Sounding Reviewed" : title(step)}</span>{index < steps.length - 1 && <span className={`mx-3 h-px flex-1 ${current > index ? "bg-sky-400" : "bg-slate-200"}`} />}</li>; })}
        </ol>
      </section>

      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      <NextActionPanel
        record={record}
        allowed={allowed}
        draftSoundings={draftSoundings}
        reviewedSoundings={reviewedSoundings}
        busy={busy}
        onTransition={(action) => setPendingAction({ kind: "transition", action })}
        onRecordSounding={() => setMode("sounding")}
        onReviewSounding={(soundingId, version) => setPendingAction({ kind: "review_sounding", soundingId, version })}
        onCreateBdn={() => setMode("bdn")}
        onEditBdn={() => setMode("edit_bdn")}
        onExport={() => record.bdn && downloadBdn(record.id, record.bdn.number).catch(() => setError("The BDN could not be exported."))}
      />

      {mode === "sounding" && <SoundingForm busy={busy} onCancel={() => setMode("")} onSubmit={createSounding} />}
      {(mode === "bdn" || mode === "edit_bdn") && <BdnForm record={record} busy={busy} editing={mode === "edit_bdn"} onCancel={() => setMode("")} onSubmit={saveBdn} />}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-[28px] bg-white p-5 sm:p-6">
          <h2 className="font-bold text-slate-950">Nomination</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Customer" value={record.customer_name} /><Info label="Receiving vessel" value={record.vessel_name} />
            <Info label="IMO number" value={record.imo_number || "Not provided"} /><Info label="Location" value={record.port} />
            <Info label="Product / grade" value={record.product_grade} /><Info label="Nominated quantity" value={`${Number(record.nominated_quantity_mt).toLocaleString()} MT`} />
            <Info label="Delivery window" value={`${localDate(record.delivery_window_start)} — ${localDate(record.delivery_window_end)}`} />
            <Info label="Version" value={String(record.version)} />
          </dl>
          {record.notes && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Operational notes</p>{record.notes}</div>}
        </section>

        <section className="rounded-[28px] bg-white p-5 sm:p-6">
          <h2 className="font-bold text-slate-950">Bunker Delivery Note</h2>
          {!record.bdn ? <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">A BDN draft becomes available after at least one sounding result is reviewed.</p> : <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="BDN number" value={record.bdn.number} /><Info label="State" value={title(record.bdn.status)} />
            <Info label="Delivered quantity" value={`${Number(record.bdn.delivered_quantity_mt).toLocaleString()} MT`} /><Info label="Flashpoint" value={`${record.bdn.flashpoint_c} °C`} />
            <Info label="Viscosity" value={`${record.bdn.viscosity_cst} cSt`} /><Info label="Sulphur / water" value={`${record.bdn.sulphur_percent}% / ${record.bdn.water_percent}%`} />
            <Info label="Supplier acknowledgement" value={record.bdn.supplier_acknowledged_by || "Pending"} /><Info label="Receiver acknowledgement" value={record.bdn.receiver_acknowledged_by || "Pending"} />
            <Info label="Approved" value={record.bdn.approved_by ? `${record.bdn.approved_by} · ${localDate(record.bdn.approved_at)}` : "Pending"} /><Info label="Issued" value={record.bdn.issued_by ? `${record.bdn.issued_by} · ${localDate(record.bdn.issued_at)}` : "Pending"} />
          </dl>}
          <p className="mt-5 text-xs leading-5 text-slate-500">Acknowledgements record who accepted the document and when. They are not represented as cryptographic signatures.</p>
        </section>
      </div>

      <section className="rounded-[28px] bg-white p-5 sm:p-6">
        <h2 className="font-bold text-slate-950">Sounding records</h2>
        <p className="mt-1 text-xs text-slate-500">Offshora stores entered measurements and reviewed results; it does not calculate ASTM corrections in this pilot.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b border-slate-100 text-xs text-slate-500"><tr><th className="py-3">Tank</th><th>Forward / aft</th><th>Observed volume</th><th>Reviewed mass</th><th>State</th><th></th></tr></thead><tbody className="divide-y divide-slate-100">
          {(record.soundings ?? []).length === 0 ? <tr><td colSpan={6} className="py-9 text-center text-slate-500">No sounding has been recorded.</td></tr> : record.soundings!.map((sounding) => <tr key={sounding.id}><td className="py-4 font-semibold">{sounding.tank_reference}</td><td>{sounding.forward_sounding_m} / {sounding.aft_sounding_m} m</td><td>{sounding.observed_volume_m3} m³</td><td>{sounding.reviewed_mass_mt} MT</td><td><Status value={sounding.status} /></td><td className="text-right">{sounding.status === "draft" && allowed.has("record_sounding") && <button disabled={busy} onClick={() => setPendingAction({ kind: "review_sounding", soundingId: sounding.id, version: sounding.version })} className="rounded-xl bg-[#0b1523] px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">Review now</button>}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="rounded-[28px] bg-white p-5 sm:p-6">
        <h2 className="font-bold text-slate-950">Audit history</h2>
        <ol className="mt-5 space-y-4">{(record.audit_events ?? []).map((event) => <li key={event.id} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-600" /><div><p className="text-sm font-semibold text-slate-800">{title(event.action)}</p><p className="text-xs text-slate-500">{event.actor} · {localDate(event.created_at)}{event.from_status || event.to_status ? ` · ${event.from_status || "new"} → ${event.to_status || "unchanged"}` : ""}</p>{event.reason && <p className="mt-1 text-sm text-slate-600">{event.reason}</p>}</div></li>)}</ol>
      </section>

      <WorkflowActionDialog action={dialogAction} busy={busy} onClose={() => setPendingAction(null)} onConfirm={completePendingAction} />
    </div>
  );
}

function NextActionPanel({
  record,
  allowed,
  draftSoundings,
  reviewedSoundings,
  busy,
  onTransition,
  onRecordSounding,
  onReviewSounding,
  onCreateBdn,
  onEditBdn,
  onExport,
}: {
  record: BunkerNomination;
  allowed: Set<string>;
  draftSoundings: BunkerSounding[];
  reviewedSoundings: BunkerSounding[];
  busy: boolean;
  onTransition: (action: string) => void;
  onRecordSounding: () => void;
  onReviewSounding: (id: string, version: number) => void;
  onCreateBdn: () => void;
  onEditBdn: () => void;
  onExport: () => void;
}) {
  const pendingSounding = draftSoundings[0];
  let eyebrow = "Next required action";
  let heading = "Workflow complete";
  let description = "This BDN has been issued and is locked against further editing.";
  let primaryLabel = "Export final PDF";
  let primaryAction = onExport;
  let waiting = false;

  if (record.status === "draft") {
    heading = "Confirm the nomination";
    description = "Check the customer, vessel, product, quantity, and delivery window before opening field measurement.";
    primaryLabel = "Confirm nomination";
    primaryAction = () => onTransition("confirm");
  } else if ((record.status === "confirmed" || record.status === "sounding_recorded") && pendingSounding) {
    heading = `Review ${pendingSounding.tank_reference}`;
    description = "A sounding draft has been saved. Complete its independent review before preparing the BDN.";
    primaryLabel = "Review sounding now";
    primaryAction = () => onReviewSounding(pendingSounding.id, pendingSounding.version);
  } else if (record.status === "confirmed") {
    heading = "Record the pre-delivery sounding";
    description = "Capture the first tank measurement and its independently calculated result. The review follows immediately after saving.";
    primaryLabel = "Record first sounding";
    primaryAction = onRecordSounding;
  } else if (record.status === "sounding_recorded") {
    heading = "Prepare the BDN draft";
    description = `${reviewedSoundings.length} sounding ${reviewedSoundings.length === 1 ? "record is" : "records are"} reviewed. Prepare the delivery note when all required tanks are covered.`;
    primaryLabel = "Create BDN draft";
    primaryAction = onCreateBdn;
  } else if (record.status === "bdn_draft") {
    heading = "Submit the BDN for approval";
    description = "Review the delivery quantity, quality values, and both acknowledgements. Draft editing closes after submission.";
    primaryLabel = "Submit for approval";
    primaryAction = () => onTransition("submit_review");
  } else if (record.status === "under_review") {
    heading = allowed.has("approve") ? "Approve the reviewed BDN" : "Awaiting owner or administrator approval";
    description = allowed.has("approve") ? "Confirm that the BDN and reviewed sounding evidence are correct before approving it for final issue." : "No action is required from your role. An owner or administrator must complete this stage.";
    primaryLabel = "Approve BDN";
    primaryAction = () => onTransition("approve");
    waiting = !allowed.has("approve");
  } else if (record.status === "approved") {
    heading = "Issue the final BDN";
    description = "This is the last step. Issuance permanently locks the BDN and enables the official PDF export.";
    primaryLabel = "Issue final BDN";
    primaryAction = () => onTransition("issue");
  } else if (record.status === "cancelled") {
    eyebrow = "Workflow closed";
    heading = "This nomination was cancelled";
    description = "Review the audit history for the cancellation reason. No further operational actions are available.";
    waiting = true;
  }

  return (
    <section aria-labelledby="next-action-heading" className="overflow-hidden rounded-[28px] bg-[#0b1523] text-white shadow-[0_16px_45px_-30px_rgba(2,8,23,.8)]">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-4">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-500/15 text-lg text-sky-300" aria-hidden="true">→</span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-300">{eyebrow}</p>
            <h2 id="next-action-heading" className="mt-1 text-lg font-bold">{heading}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
            {(record.status === "confirmed" || record.status === "sounding_recorded") && (
              <p className="mt-2 text-xs leading-5 text-slate-400">Multiple tank soundings are supported. Use a unique tank reference for each one; every saved draft must be reviewed before BDN preparation.</p>
            )}
          </div>
        </div>
        {!waiting && (
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            {record.status === "sounding_recorded" && allowed.has("record_sounding") && !pendingSounding && <button type="button" onClick={onRecordSounding} className="h-11 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Add another tank</button>}
            {record.status === "bdn_draft" && allowed.has("edit_bdn") && <button type="button" onClick={onEditBdn} className="h-11 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Review or edit draft</button>}
            <button type="button" disabled={busy} onClick={primaryAction} className="h-11 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50">{primaryLabel}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function Action({ primary, danger, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; danger?: boolean }) {
  const tone = primary ? "bg-[#0b1523] text-white hover:bg-slate-800" : danger ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  return <button type="button" {...props} className={`h-10 rounded-full px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50 ${tone}`} />;
}
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>; }
function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label, ...rest } = props; return <label className="text-xs font-semibold text-slate-700">{label}<input {...rest} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>; }

function SoundingForm({ onSubmit, onCancel, busy }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; busy: boolean }) {
  return <section className="rounded-[28px] border border-sky-100 bg-white p-5 sm:p-6"><h2 className="font-bold text-slate-950">Record pre-delivery sounding</h2><p className="mt-1 text-xs text-slate-500">Enter the source measurements and the independently calculated, reviewed result. State the worksheet or method used.</p><form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Input name="tank_reference" label="Tank reference" required /><Input name="forward_sounding_m" label="Forward sounding (m)" type="number" min="0" step="0.001" required /><Input name="aft_sounding_m" label="Aft sounding (m)" type="number" min="0" step="0.001" required /><Input name="observed_temperature_c" label="Observed temperature (°C)" type="number" step="0.001" required />
    <Input name="observed_volume_m3" label="Observed volume (m³)" type="number" min="0.001" step="0.001" required /><Input name="density_kg_m3" label="Density (kg/m³)" type="number" min="0.001" step="0.001" required /><Input name="reviewed_volume_m3" label="Reviewed volume (m³)" type="number" min="0.001" step="0.001" required /><Input name="reviewed_mass_mt" label="Reviewed mass (MT)" type="number" min="0.001" step="0.001" required />
    <label className="md:col-span-2 lg:col-span-4 text-xs font-semibold text-slate-700">Calculation method / worksheet reference<textarea name="calculation_method_note" required rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
    <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2"><Action onClick={onCancel}>Cancel</Action><button disabled={busy} className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save sounding</button></div>
  </form></section>;
}

function BdnForm({ record, editing, onSubmit, onCancel, busy }: { record: BunkerNomination; editing: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; busy: boolean }) {
  const bdn = record.bdn;
  const dateInput = (value?: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  return <section className="rounded-[28px] border border-sky-100 bg-white p-5 sm:p-6"><h2 className="font-bold text-slate-950">{editing ? "Edit BDN draft" : "Create BDN draft"}</h2><p className="mt-1 text-xs text-slate-500">Fuel quality values are recorded as supplied. Confirm their source before review.</p><form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Input name="number" label="BDN number" defaultValue={bdn?.number} required /><Input name="delivered_quantity_mt" label="Delivered quantity (MT)" type="number" min="0.001" step="0.001" defaultValue={bdn?.delivered_quantity_mt} required /><Input name="flashpoint_c" label="Flashpoint (°C)" type="number" min="0" step="0.001" defaultValue={bdn?.flashpoint_c} required /><Input name="viscosity_cst" label="Viscosity (cSt)" type="number" min="0" step="0.001" defaultValue={bdn?.viscosity_cst} required />
    <Input name="sulphur_percent" label="Sulphur (%)" type="number" min="0" step="0.0001" defaultValue={bdn?.sulphur_percent} required /><Input name="water_percent" label="Water (%)" type="number" min="0" step="0.0001" defaultValue={bdn?.water_percent} required /><Input name="supplier_acknowledged_by" label="Supplier acknowledgement by" defaultValue={bdn?.supplier_acknowledged_by} required /><Input name="supplier_acknowledged_at" label="Supplier acknowledgement time" type="datetime-local" defaultValue={dateInput(bdn?.supplier_acknowledged_at)} required />
    <Input name="receiver_acknowledged_by" label="Receiver acknowledgement by" defaultValue={bdn?.receiver_acknowledged_by} required /><Input name="receiver_acknowledged_at" label="Receiver acknowledgement time" type="datetime-local" defaultValue={dateInput(bdn?.receiver_acknowledged_at)} required />
    <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-2"><Action onClick={onCancel}>Cancel</Action><button disabled={busy} className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save BDN draft</button></div>
  </form></section>;
}
