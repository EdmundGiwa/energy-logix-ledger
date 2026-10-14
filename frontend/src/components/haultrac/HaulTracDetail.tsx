"use client";

/* eslint-disable @next/next/no-img-element -- The QR is a protected, dynamic SVG API response. */

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, HaulDispatch, downloadDeliveryDocument, haulApi, haulQrUrl } from "@/lib/api";
import { WorkflowActionDialog, WorkflowDialogAction } from "@/components/bunkerflow/WorkflowActionDialog";
import { Status } from "./HaulTracList";

const stages = ["Draft", "Weighed", "e-Waybill", "In transit", "Arrived", "Discharging", "Delivered", "Closed"];
const transitions: Record<string, Omit<WorkflowDialogAction, "key">> = {
  dispatch: { title: "Release this dispatch?", description: "This locks the vehicle assignment, weighbridge readings, and e-Waybill for the trip.", reasonLabel: "Dispatch authority or operational reason", confirmLabel: "Release dispatch" },
  start_trip: { title: "Mark the truck in transit?", description: "Use this when the assigned truck has physically departed the loading location.", reasonLabel: "Departure confirmation", confirmLabel: "Start trip" },
  arrive: { title: "Confirm arrival?", description: "Use this when the truck has reached the delivery location.", reasonLabel: "Arrival confirmation", confirmLabel: "Confirm arrival" },
  start_discharge: { title: "Start discharge?", description: "Confirm that the receiving location has authorised discharge to begin.", reasonLabel: "Discharge authority", confirmLabel: "Start discharge" },
  close: { title: "Close this delivery?", description: "Closure finalises the acknowledged proof of delivery and makes the trip record immutable.", reasonLabel: "Reconciliation and closure reason", confirmLabel: "Close delivery" },
  cancel: { title: "Cancel this draft dispatch?", description: "The cancelled dispatch remains in the audit history and cannot continue through the workflow.", reasonLabel: "Cancellation reason", confirmLabel: "Cancel dispatch", destructive: true },
};

function field(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function display(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function HaulTracDetail({ id }: { id: string }) {
  const [dispatch, setDispatch] = useState<HaulDispatch | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialogAction, setDialogAction] = useState<WorkflowDialogAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setDispatch(await haulApi.detail(id)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "The dispatch could not be loaded."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  const readings = useMemo(() => Object.fromEntries((dispatch?.weighbridge_readings ?? []).map((item) => [item.kind, item])), [dispatch]);
  const stageIndex = useMemo(() => {
    if (!dispatch) return 0;
    if (dispatch.status === "closed") return 7;
    if (dispatch.status === "delivered") return 6;
    if (dispatch.status === "discharging") return 5;
    if (dispatch.status === "arrived") return 4;
    if (["dispatched", "in_transit"].includes(dispatch.status)) return 3;
    if (dispatch.waybill) return 2;
    if (readings.tare && readings.gross) return 1;
    return 0;
  }, [dispatch, readings]);

  async function runTransition(reason: string) {
    if (!dispatch || !dialogAction) return;
    setBusy(true); setError("");
    try { setDispatch(await haulApi.transition(dispatch.id, dialogAction.key, dispatch.version, reason)); setDialogAction(null); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "The workflow action could not be completed."); }
    finally { setBusy(false); }
  }

  async function recordReading(event: FormEvent<HTMLFormElement>, kind: "tare" | "gross") {
    event.preventDefault(); if (!dispatch) return; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { setDispatch(await haulApi.recordWeighbridge(dispatch.id, { version: dispatch.version, kind, weight_kg: field(form, "weight_kg"), captured_at: new Date(field(form, "captured_at")).toISOString(), weighbridge_name: field(form, "weighbridge_name"), ticket_number: field(form, "ticket_number") })); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "The weighbridge reading could not be recorded."); }
    finally { setBusy(false); }
  }

  async function generateWaybill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!dispatch) return; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { setDispatch(await haulApi.generateWaybill(dispatch.id, dispatch.version, field(form, "number"))); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "The e-Waybill could not be generated."); }
    finally { setBusy(false); }
  }

  async function recordPod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!dispatch) return; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { setDispatch(await haulApi.recordPod(dispatch.id, { version: dispatch.version, delivered_quantity_litres: field(form, "delivered_quantity_litres"), ullage_mm: field(form, "ullage_mm"), observed_temperature_c: field(form, "observed_temperature_c"), water_paste_result: field(form, "water_paste_result"), receiver_name: field(form, "receiver_name"), receiver_title: field(form, "receiver_title"), receiver_acknowledged_at: new Date(field(form, "receiver_acknowledged_at")).toISOString(), notes: field(form, "notes") })); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Proof of delivery could not be recorded."); }
    finally { setBusy(false); }
  }

  async function exportDocument() {
    if (!dispatch) return; setBusy(true); setError("");
    try { await downloadDeliveryDocument(dispatch.id, dispatch.waybill?.number ?? dispatch.reference); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "The delivery document could not be exported."); }
    finally { setBusy(false); }
  }

  function openTransition(key: string) { const action = transitions[key]; if (action) setDialogAction({ key, ...action }); }

  if (loading) return <div className="rounded-[28px] bg-white p-10 text-center text-sm text-slate-500">Loading dispatch…</div>;
  if (!dispatch) return <div role="alert" className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800">{error || "Dispatch not found."}</div>;

  const next = nextAction(dispatch, readings);
  return <div className="mx-auto max-w-[1400px] space-y-5 pb-10">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/dashboard/haul-trac" className="text-xs font-semibold text-emerald-700 hover:underline">← HaulTrac</Link><div className="mt-2 flex items-center gap-3"><h1 className="font-mono text-2xl font-bold text-slate-950">{dispatch.reference}</h1><Status value={dispatch.status} /></div><p className="mt-1 text-sm text-slate-500">{dispatch.truck_registration} · {dispatch.product} · {dispatch.origin_name} → {dispatch.destination_name}</p></div>{dispatch.allowed_actions?.includes("cancel") && <button type="button" onClick={() => openTransition("cancel")} className="h-10 rounded-full border border-rose-200 bg-white px-4 text-xs font-semibold text-rose-700">Cancel dispatch</button>}</header>

    <section aria-label="Trip progress" className="overflow-x-auto rounded-[24px] bg-white px-5 py-5"><ol className="flex min-w-[900px] items-center">{stages.map((stage, index) => <li key={stage} className="flex flex-1 items-center last:flex-none"><span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${index <= stageIndex ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-400"}`}>{index < stageIndex ? "✓" : index + 1}</span><span className={`ml-2 text-xs font-semibold ${index <= stageIndex ? "text-slate-800" : "text-slate-400"}`}>{stage}</span>{index < stages.length - 1 && <span className={`mx-3 h-px flex-1 ${index < stageIndex ? "bg-emerald-400" : "bg-slate-200"}`} />}</li>)}</ol></section>

    <section className="rounded-[28px] bg-[#0b1523] p-5 text-white sm:p-6"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-300">Next required action</p><h2 className="mt-1 text-xl font-bold">{next.title}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">{next.description}</p></div>{next.transition && <button type="button" onClick={() => openTransition(next.transition!)} className="h-11 shrink-0 rounded-xl bg-white px-5 text-sm font-bold text-slate-950">{next.button}</button>}{next.export && <button type="button" disabled={busy} onClick={exportDocument} className="h-11 shrink-0 rounded-xl bg-white px-5 text-sm font-bold text-slate-950">Export final PDF</button>}</div>{next.form === "tare" && <ReadingForm kind="tare" busy={busy} onSubmit={recordReading} />}{next.form === "gross" && <ReadingForm kind="gross" busy={busy} onSubmit={recordReading} />}{next.form === "waybill" && <WaybillForm busy={busy} onSubmit={generateWaybill} />}{next.form === "pod" && <PodForm busy={busy} onSubmit={recordPod} planned={dispatch.planned_quantity_litres} />}</section>

    {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

    <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]"><section className="rounded-[28px] bg-white p-5 sm:p-6"><h2 className="font-bold text-slate-950">Dispatch assignment</h2><dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2"><Datum label="Customer" value={dispatch.customer_name} /><Datum label="Product / quantity" value={`${dispatch.product} · ${Number(dispatch.planned_quantity_litres).toLocaleString()} L`} /><Datum label="Origin" value={dispatch.origin_name} /><Datum label="Destination" value={dispatch.destination_name} /><Datum label="Truck / trailer" value={`${dispatch.truck_registration} / ${dispatch.trailer_registration}`} /><Datum label="Driver" value={dispatch.driver_name} /><Datum label="Scheduled departure" value={new Date(dispatch.scheduled_departure_at).toLocaleString()} /><Datum label="Version" value={String(dispatch.version)} /></dl>{dispatch.notes && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-[11px] font-bold uppercase text-slate-400">Dispatch notes</p><p className="mt-1 text-sm text-slate-700">{dispatch.notes}</p></div>}</section><section className="rounded-[28px] bg-white p-5 sm:p-6"><h2 className="font-bold text-slate-950">e-Waybill</h2>{dispatch.waybill ? <div className="mt-4"><p className="font-mono text-lg font-bold text-slate-950">{dispatch.waybill.number}</p><p className="mt-1 text-xs text-slate-500">Issued {new Date(dispatch.waybill.issued_at).toLocaleString()}</p>{/* SVG is a protected API response, not a static image Next can optimize. */}<img src={haulQrUrl(dispatch.id)} alt={`Verification QR code for ${dispatch.waybill.number}`} className="mx-auto mt-4 h-40 w-40" /><p className="mt-3 text-center text-xs text-slate-500">Scanning requires an authenticated user in this organization.</p></div> : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Available after valid tare and gross readings are recorded.</p>}</section></div>

    <section className="rounded-[28px] bg-white p-5 sm:p-6"><div className="flex items-end justify-between"><div><h2 className="font-bold text-slate-950">Weighbridge readings</h2><p className="mt-1 text-xs text-slate-500">Manual entries are permanently labelled and cannot be edited.</p></div>{readings.tare && readings.gross && <p className="font-mono text-sm font-bold text-slate-900">Net {(Number(readings.gross.weight_kg) - Number(readings.tare.weight_kg)).toLocaleString()} kg</p>}</div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b border-slate-100 text-xs text-slate-500"><tr><th className="py-3">Reading</th><th>Weight</th><th>Source</th><th>Weighbridge</th><th>Captured</th></tr></thead><tbody className="divide-y divide-slate-100">{(dispatch.weighbridge_readings ?? []).length ? dispatch.weighbridge_readings!.map((item) => <tr key={item.id}><td className="py-4 font-semibold">{display(item.kind)}</td><td className="font-mono">{Number(item.weight_kg).toLocaleString()} kg</td><td><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Manual entry</span></td><td>{item.weighbridge_name}<p className="text-xs text-slate-400">{item.ticket_number || "No ticket number"}</p></td><td className="text-xs text-slate-500">{new Date(item.captured_at).toLocaleString()}</td></tr>) : <tr><td colSpan={5} className="py-10 text-center text-slate-500">No readings recorded.</td></tr>}</tbody></table></div></section>

    {dispatch.proof_of_delivery && <section className="rounded-[28px] bg-white p-5 sm:p-6"><h2 className="font-bold text-slate-950">Acknowledged proof of delivery</h2><dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4"><Datum label="Delivered quantity" value={`${Number(dispatch.proof_of_delivery.delivered_quantity_litres).toLocaleString()} L`} /><Datum label="Ullage" value={`${dispatch.proof_of_delivery.ullage_mm} mm`} /><Datum label="Temperature" value={`${dispatch.proof_of_delivery.observed_temperature_c} °C`} /><Datum label="Water-paste test" value={display(dispatch.proof_of_delivery.water_paste_result)} /><Datum label="Receiver" value={dispatch.proof_of_delivery.receiver_name} /><Datum label="Receiver title" value={dispatch.proof_of_delivery.receiver_title} /><Datum label="Acknowledged" value={new Date(dispatch.proof_of_delivery.receiver_acknowledged_at).toLocaleString()} /></dl><p className="mt-5 text-xs text-slate-500">This is an operational electronic acknowledgement, not a cryptographic signature.</p></section>}

    <section className="rounded-[28px] bg-white p-5 sm:p-6"><h2 className="font-bold text-slate-950">Audit history</h2><ol className="mt-5 space-y-4">{dispatch.audit_events?.map((event) => <li key={event.id} className="relative pl-5 before:absolute before:left-0 before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-violet-600"><p className="text-sm font-bold text-slate-800">{display(event.action)}</p><p className="text-xs text-slate-500">{event.actor} · {new Date(event.created_at).toLocaleString()}{event.from_status && ` · ${display(event.from_status)} → ${display(event.to_status)}`}</p>{event.reason && <p className="mt-1 text-sm text-slate-600">{event.reason}</p>}</li>)}</ol></section>
    <WorkflowActionDialog action={dialogAction} busy={busy} onClose={() => setDialogAction(null)} onConfirm={runTransition} />
  </div>;
}

function nextAction(dispatch: HaulDispatch, readings: Record<string, { weight_kg: string }>) {
  const actions = dispatch.allowed_actions ?? [];
  if (dispatch.status === "closed") return { title: "Delivery closed", description: "The final record is immutable and ready for export.", export: true };
  if (dispatch.status === "cancelled") return { title: "Dispatch cancelled", description: "This record remains available for audit but cannot continue.", button: "" };
  if (dispatch.status === "draft" && !readings.tare) return { title: "Record tare weight", description: "Enter the unladen truck and trailer weight from the weighbridge ticket. This MVP records manual readings only.", form: "tare" };
  if (dispatch.status === "draft" && !readings.gross) return { title: "Record gross weight", description: "Enter the loaded combination weight. Gross must be greater than tare.", form: "gross" };
  if (dispatch.status === "draft" && !dispatch.waybill) return { title: "Generate the e-Waybill", description: "Review the assignment and locked weighbridge readings, then issue a QR-verifiable waybill.", form: "waybill" };
  if (actions.includes("dispatch")) return { title: "Release the dispatch", description: "The e-Waybill is ready. Confirm the truck is authorised to leave the loading location.", transition: "dispatch", button: "Release dispatch" };
  if (actions.includes("start_trip")) return { title: "Confirm physical departure", description: "Mark the truck in transit only after it has left the loading location.", transition: "start_trip", button: "Start trip" };
  if (actions.includes("arrive")) return { title: "Confirm destination arrival", description: "Use this when the assigned truck reaches the receiving location.", transition: "arrive", button: "Confirm arrival" };
  if (actions.includes("start_discharge")) return { title: "Authorise discharge", description: "Confirm receiving-site permission before the product is discharged.", transition: "start_discharge", button: "Start discharge" };
  if (actions.includes("record_pod")) return { title: "Record proof of delivery", description: "Capture delivery measurements and the receiver's acknowledgement to complete delivery.", form: "pod" };
  if (dispatch.status === "delivered" && actions.includes("close")) return { title: "Review and close the trip", description: "Reconcile the acknowledged delivery before making the trip record immutable.", transition: "close", button: "Close delivery" };
  if (dispatch.status === "delivered") return { title: "Awaiting authorised closure", description: "An organization owner or administrator must review and close this delivery.", button: "" };
  return { title: "Review this trip", description: "No workflow action is currently available for your role.", button: "" };
}

function ReadingForm({ kind, busy, onSubmit }: { kind: "tare" | "gross"; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>, kind: "tare" | "gross") => void }) { return <form onSubmit={(event) => onSubmit(event, kind)} className="mt-5 grid gap-3 rounded-2xl bg-white/5 p-4 sm:grid-cols-2 lg:grid-cols-4"><DarkInput name="weight_kg" label={`${display(kind)} weight (kg)`} type="number" min="0.001" step="0.001" required /><DarkInput name="captured_at" label="Captured at" type="datetime-local" required /><DarkInput name="weighbridge_name" label="Weighbridge name" required /><DarkInput name="ticket_number" label="Ticket number" /><div className="flex justify-end sm:col-span-2 lg:col-span-4"><button disabled={busy} className="h-10 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-slate-950 disabled:opacity-60">{busy ? "Recording…" : `Record ${kind}`}</button></div></form>; }
function WaybillForm({ busy, onSubmit }: { busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-end"><DarkInput name="number" label="e-Waybill number (optional)" placeholder="Generated automatically if blank" /><button disabled={busy} className="h-10 shrink-0 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-slate-950 disabled:opacity-60">{busy ? "Generating…" : "Generate e-Waybill"}</button></form>; }
function PodForm({ busy, onSubmit, planned }: { busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; planned: string }) { return <form onSubmit={onSubmit} className="mt-5 grid gap-3 rounded-2xl bg-white/5 p-4 sm:grid-cols-2 lg:grid-cols-4"><DarkInput name="delivered_quantity_litres" label="Delivered quantity (L)" type="number" min="0.001" step="0.001" defaultValue={planned} required /><DarkInput name="ullage_mm" label="Ullage (mm)" type="number" min="0" step="0.001" required /><DarkInput name="observed_temperature_c" label="Temperature (°C)" type="number" step="0.001" required /><label className="text-xs font-semibold text-slate-200">Water-paste test<select name="water_paste_result" className="mt-1.5 h-10 w-full rounded-xl border border-white/15 bg-slate-900 px-3 text-sm text-white"><option value="clear">Clear</option><option value="water_detected">Water detected</option></select></label><DarkInput name="receiver_name" label="Receiver name" required /><DarkInput name="receiver_title" label="Receiver title" required /><DarkInput name="receiver_acknowledged_at" label="Acknowledged at" type="datetime-local" required /><DarkInput name="notes" label="Delivery notes" /><div className="flex justify-end sm:col-span-2 lg:col-span-4"><button disabled={busy} className="h-10 rounded-xl bg-violet-500 px-5 text-sm font-bold text-white disabled:opacity-60">{busy ? "Recording…" : "Record acknowledged delivery"}</button></div></form>; }
function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label, ...rest } = props; return <label className="text-xs font-semibold text-slate-200">{label}<input {...rest} className="mt-1.5 h-10 w-full rounded-xl border border-white/15 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></label>; }
function Datum({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>; }
