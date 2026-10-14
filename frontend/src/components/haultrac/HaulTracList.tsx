"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, HaulDispatch, HaulFleet, HaulSummary, haulApi } from "@/lib/api";
import { FleetSetupJourney } from "./FleetSetupJourney";

const statuses = ["", "draft", "dispatched", "in_transit", "arrived", "discharging", "delivered", "closed", "cancelled"];
const stageOrder = ["customer", "route", "truck", "trailer", "driver"] as const;
type FleetStage = (typeof stageOrder)[number];
const stageLabels: Record<FleetStage, string> = { customer: "Customer", route: "Route", truck: "Truck", trailer: "Trailer", driver: "Driver" };
const stageDescriptions: Record<FleetStage, string> = {
  customer: "Add the company this fleet will serve.",
  route: "Add both ends of the delivery route. Origin and destination are required together.",
  truck: "Add the powered vehicle assigned to this fleet.",
  trailer: "Add the calibrated trailer that will carry the product.",
  driver: "Add the licensed driver responsible for this fleet.",
};

function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function field(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }

export function HaulTracList() {
  const router = useRouter();
  const [records, setRecords] = useState<HaulDispatch[]>([]);
  const [fleets, setFleets] = useState<HaulFleet[]>([]);
  const [summary, setSummary] = useState<HaulSummary | null>(null);
  const [activeFleet, setActiveFleet] = useState<HaulFleet | null>(null);
  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchFleetId, setDispatchFleetId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    try {
      const [list, totals, fleetList] = await Promise.all([haulApi.list(params.toString()), haulApi.summary(), haulApi.fleets()]);
      setRecords(list.results); setSummary(totals); setFleets(fleetList);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("HaulTrac could not be loaded.", 0));
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [load]);

  const readyFleets = fleets.filter((fleet) => fleet.status === "ready");
  const draftFleets = fleets.filter((fleet) => fleet.status === "draft");

  async function createFleet() {
    setSubmitting(true); setError(null); setShowDispatch(false);
    try {
      const fleet = await haulApi.createFleet();
      setFleets((items) => [fleet, ...items]);
      setActiveFleet(fleet);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("The fleet draft could not be created.", 0));
    } finally { setSubmitting(false); }
  }

  async function saveStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFleet || activeFleet.next_step === "complete") return;
    setSubmitting(true); setError(null);
    const form = new FormData(event.currentTarget);
    const stage = activeFleet.next_step as FleetStage;
    let data: Record<string, unknown>;
    if (stage === "customer") data = { name: field(form, "name"), contact_name: field(form, "contact_name"), contact_phone: field(form, "contact_phone") };
    else if (stage === "route") data = {
      origin: { name: field(form, "origin_name"), address: field(form, "origin_address"), contact_name: field(form, "origin_contact_name"), contact_phone: field(form, "origin_contact_phone") },
      destination: { name: field(form, "destination_name"), address: field(form, "destination_address"), contact_name: field(form, "destination_contact_name"), contact_phone: field(form, "destination_contact_phone") },
    };
    else if (stage === "truck") data = { registration_number: field(form, "registration_number"), fleet_number: field(form, "fleet_number"), make_model: field(form, "make_model"), capacity_litres: field(form, "capacity_litres") };
    else if (stage === "trailer") data = { registration_number: field(form, "registration_number"), fleet_number: field(form, "fleet_number"), capacity_litres: field(form, "capacity_litres"), calibration_expires_on: field(form, "calibration_expires_on") || null };
    else data = { full_name: field(form, "full_name"), phone_number: field(form, "phone_number"), licence_number: field(form, "licence_number"), licence_expires_on: field(form, "licence_expires_on") };
    try {
      const updated = await haulApi.saveFleetStage(activeFleet.id, stage, activeFleet.version, data);
      setActiveFleet(updated);
      setFleets((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(`The ${stageLabels[stage].toLowerCase()} stage could not be saved.`, 0));
    } finally { setSubmitting(false); }
  }

  async function createDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const dispatch = await haulApi.create({
        fleet_id: field(form, "fleet_id"), product: field(form, "product"),
        planned_quantity_litres: field(form, "planned_quantity_litres"),
        scheduled_departure_at: new Date(field(form, "scheduled_departure_at")).toISOString(),
        notes: field(form, "notes"),
      });
      router.push(`/dashboard/haul-trac/${dispatch.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("The dispatch could not be created.", 0));
      setSubmitting(false);
    }
  }

  const metrics = [
    ["Active trips", summary?.active_trips ?? "—", "Trips currently in operation"],
    ["Fleet drafts", draftFleets.length, "Incomplete setups you can resume"],
    ["Ready fleets", readyFleets.length, "Available for a new dispatch"],
    ["Closed trips", summary?.closed_trips ?? "—", "Completed delivery records"],
  ];

  return <div className="mx-auto max-w-[1400px] space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[13px] font-semibold text-emerald-700">HaulTrac</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">Bulk road haulage</h1><p className="mt-1 max-w-2xl text-sm text-slate-500">Build fleet assignments, prepare dispatches, issue e-Waybills, and close acknowledged deliveries.</p></div><div className="flex gap-2"><button type="button" onClick={createFleet} disabled={submitting} className="h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60">+ New fleet</button><button type="button" onClick={() => { setActiveFleet(null); setDispatchFleetId(readyFleets[0]?.id ?? ""); setShowDispatch((value) => !value); }} disabled={readyFleets.length === 0} title={readyFleets.length ? undefined : "Complete a fleet before creating a dispatch"} className="h-11 rounded-full bg-[#0b1523] px-5 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-45">+ New dispatch</button></div></header>
    <section aria-label="HaulTrac summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([title, value, sub]) => <div key={title} className="rounded-[24px] bg-white p-5"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></div>)}</section>
    {error && <ErrorNotice error={error} onDismiss={() => setError(null)} />}
    {activeFleet?.status === "draft" && <FleetSetupJourney steps={stageOrder.map((key, index) => ({ key, label: stageLabels[key], description: stageDescriptions[key], count: activeFleet.completed_steps > index ? 1 : 0, required: 1 }))} activeKey={activeFleet.next_step} onStepChange={() => undefined}><div className="mb-6 flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-sm font-bold text-slate-900">{activeFleet.reference}</p><p className="mt-1 text-xs text-slate-500">Saved after every stage. You can leave and resume this draft from the fleet list.</p></div><button type="button" onClick={() => setActiveFleet(null)} className="text-sm font-semibold text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Save and exit</button></div><FleetStageForm stage={activeFleet.next_step as FleetStage} submitting={submitting} onSubmit={saveStage} /></FleetSetupJourney>}
    {activeFleet?.status === "ready" && <section className="rounded-[28px] border border-emerald-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Fleet ready</p><div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-slate-950">{activeFleet.reference} is complete</h2><p className="mt-2 text-sm text-slate-500">{activeFleet.customer?.name} · {activeFleet.origin?.name} → {activeFleet.destination?.name} · {activeFleet.truck?.registration_number}</p></div><div className="flex gap-2"><button type="button" onClick={() => setActiveFleet(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Back to fleets</button><button type="button" onClick={() => { setDispatchFleetId(activeFleet.id); setActiveFleet(null); setShowDispatch(true); }} className="h-10 rounded-xl bg-[#0b1523] px-4 text-sm font-semibold text-white">Create dispatch</button></div></div></section>}
    {!activeFleet && <FleetLedger fleets={fleets} loading={loading} onResume={(fleet) => { setShowDispatch(false); setActiveFleet(fleet); }} onDispatch={(fleet) => { setDispatchFleetId(fleet.id); setActiveFleet(null); setShowDispatch(true); }} />}
    {showDispatch && readyFleets.length > 0 && <section className="rounded-[28px] bg-white p-5 sm:p-6" aria-labelledby="new-dispatch-title"><div className="mb-5"><h2 id="new-dispatch-title" className="text-lg font-bold text-slate-950">New dispatch</h2><p className="mt-1 text-sm text-slate-500">Choose a completed fleet, then add the cargo and departure details for this trip.</p></div><form onSubmit={createDispatch} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><Select key={dispatchFleetId} name="fleet_id" label="Fleet" defaultValue={dispatchFleetId} items={readyFleets.map((fleet) => [fleet.id, `${fleet.reference} · ${fleet.truck?.registration_number ?? "Unassigned"}`])} /><Input name="product" label="Product" placeholder="e.g. AGO" required /><Input name="planned_quantity_litres" label="Planned quantity (litres)" type="number" step="0.001" min="0.001" required /><Input name="scheduled_departure_at" label="Scheduled departure" type="datetime-local" required /><label className="text-xs font-semibold text-slate-700 md:col-span-2 lg:col-span-3">Dispatch notes<textarea name="notes" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label><div className="flex justify-end md:col-span-2 lg:col-span-3"><button disabled={submitting} className="rounded-xl bg-[#0b1523] px-5 py-2.5 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60">{submitting ? "Creating…" : "Create draft dispatch"}</button></div></form></section>}
    <DispatchLedger records={records} loading={loading} search={search} statusFilter={statusFilter} onSearch={setSearch} onStatus={setStatusFilter} />
  </div>;
}

function FleetLedger({ fleets, loading, onResume, onDispatch }: { fleets: HaulFleet[]; loading: boolean; onResume: (fleet: HaulFleet) => void; onDispatch: (fleet: HaulFleet) => void }) {
  return <section className="overflow-hidden rounded-[28px] bg-white"><div className="border-b border-slate-100 p-5"><h2 className="font-bold text-slate-950">Fleet records</h2><p className="mt-1 text-xs text-slate-500">Every new fleet is saved immediately as a draft and can be resumed here.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">Fleet</th><th className="px-5 py-3">Customer and route</th><th className="px-5 py-3">Vehicle and driver</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Loading fleets…</td></tr> : fleets.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center"><p className="font-semibold text-slate-700">No fleets yet</p><p className="mt-1 text-xs text-slate-500">Create your first fleet to begin the five-stage setup.</p></td></tr> : fleets.map((fleet) => <tr key={fleet.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-mono font-bold text-slate-900">{fleet.reference}</p><p className="mt-1 text-xs text-slate-500">Updated {new Date(fleet.updated_at).toLocaleString()}</p></td><td className="px-5 py-4"><p className="font-semibold text-slate-900">{fleet.customer?.name ?? "Customer not added"}</p><p className="mt-1 text-xs text-slate-500">{fleet.origin && fleet.destination ? `${fleet.origin.name} → ${fleet.destination.name}` : "Route not added"}</p></td><td className="px-5 py-4"><p className="text-slate-800">{fleet.truck?.registration_number ?? "Truck not added"}{fleet.trailer ? ` / ${fleet.trailer.registration_number}` : ""}</p><p className="mt-1 text-xs text-slate-500">{fleet.driver?.full_name ?? "Driver not added"}</p></td><td className="px-5 py-4"><p className="font-semibold text-slate-800">{fleet.status === "ready" ? "Ready" : `${fleet.completed_steps} of 5 stages`}</p><div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${fleet.completed_steps * 20}%` }} /></div></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => fleet.status === "ready" ? onDispatch(fleet) : onResume(fleet)} className="h-9 rounded-xl bg-[#0b1523] px-4 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">{fleet.status === "ready" ? "Create dispatch" : `Resume ${stageLabels[fleet.next_step as FleetStage].toLowerCase()}`}</button></td></tr>)}</tbody></table></div></section>;
}

function FleetStageForm({ stage, submitting, onSubmit }: { stage: FleetStage; submitting: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const nextStage = stageOrder[stageOrder.indexOf(stage) + 1];
  return <form onSubmit={onSubmit} className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Current stage</p><h3 className="mt-2 text-xl font-bold text-slate-950">{stageLabels[stage]}</h3><p className="mt-1 text-sm text-slate-500">{stageDescriptions[stage]}</p></div>
    {stage === "customer" && <div className="grid gap-5 md:grid-cols-3"><Input name="name" label="Customer name" required /><Input name="contact_name" label="Contact name" /><Input name="contact_phone" label="Contact phone" /></div>}
    {stage === "route" && <div className="grid gap-6 lg:grid-cols-2"><fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-5"><legend className="px-2 text-sm font-bold text-slate-900">Loading origin</legend><Input name="origin_name" label="Location name" required /><Input name="origin_address" label="Address" required /><div className="grid gap-4 sm:grid-cols-2"><Input name="origin_contact_name" label="Contact name" /><Input name="origin_contact_phone" label="Contact phone" /></div></fieldset><fieldset className="grid gap-4 rounded-2xl border border-slate-200 p-5"><legend className="px-2 text-sm font-bold text-slate-900">Delivery destination</legend><Input name="destination_name" label="Location name" required /><Input name="destination_address" label="Address" required /><div className="grid gap-4 sm:grid-cols-2"><Input name="destination_contact_name" label="Contact name" /><Input name="destination_contact_phone" label="Contact phone" /></div></fieldset></div>}
    {stage === "truck" && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"><Input name="registration_number" label="Registration number" required /><Input name="fleet_number" label="Fleet number" /><Input name="make_model" label="Make and model" /><Input name="capacity_litres" label="Capacity (litres)" type="number" min="0.001" step="0.001" required /></div>}
    {stage === "trailer" && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"><Input name="registration_number" label="Registration number" required /><Input name="fleet_number" label="Fleet number" /><Input name="capacity_litres" label="Capacity (litres)" type="number" min="0.001" step="0.001" required /><Input name="calibration_expires_on" label="Calibration expires" type="date" /></div>}
    {stage === "driver" && <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"><Input name="full_name" label="Full name" required /><Input name="phone_number" label="Phone number" required /><Input name="licence_number" label="Licence number" required /><Input name="licence_expires_on" label="Licence expires" type="date" required /></div>}
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Saving advances this fleet to the next required stage.</p><button disabled={submitting} className="h-11 rounded-xl bg-[#0b1523] px-6 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60">{submitting ? "Saving…" : nextStage ? `Save and continue to ${stageLabels[nextStage].toLowerCase()}` : "Complete fleet"}</button></div>
  </form>;
}

function DispatchLedger({ records, loading, search, statusFilter, onSearch, onStatus }: { records: HaulDispatch[]; loading: boolean; search: string; statusFilter: string; onSearch: (value: string) => void; onStatus: (value: string) => void }) {
  return <section className="overflow-hidden rounded-[28px] bg-white"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-950">Dispatch ledger</h2><p className="text-xs text-slate-500">Open a trip to continue its controlled delivery workflow.</p></div><div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Search dispatches" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search reference, truck, driver…" className="h-10 min-w-64 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500" /><select aria-label="Filter by status" value={statusFilter} onChange={(event) => onStatus(event.target.value)} className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500">{statuses.map((value) => <option key={value} value={value}>{value ? label(value) : "All statuses"}</option>)}</select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">Dispatch</th><th className="px-5 py-3">Route / customer</th><th className="px-5 py-3">Assignment</th><th className="px-5 py-3">Cargo</th><th className="px-5 py-3">Departure</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Loading dispatches…</td></tr> : records.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No dispatches match this view.</td></tr> : records.map((record) => <tr key={record.id} className="hover:bg-slate-50"><td className="px-5 py-4"><Link href={`/dashboard/haul-trac/${record.id}`} className="font-mono font-bold text-sky-800 hover:underline">{record.reference}</Link>{record.waybill_number && <p className="mt-1 text-xs text-slate-500">{record.waybill_number}</p>}</td><td className="px-5 py-4"><p className="font-semibold text-slate-900">{record.origin_name} → {record.destination_name}</p><p className="text-xs text-slate-500">{record.customer_name}</p></td><td className="px-5 py-4"><p>{record.truck_registration} / {record.trailer_registration}</p><p className="text-xs text-slate-500">{record.driver_name}</p></td><td className="px-5 py-4"><p>{record.product}</p><p className="font-mono text-xs text-slate-500">{Number(record.planned_quantity_litres).toLocaleString()} L</p></td><td className="px-5 py-4 text-xs text-slate-600">{new Date(record.scheduled_departure_at).toLocaleString()}</td><td className="px-5 py-4"><Status value={record.status} /></td></tr>)}</tbody></table></div></section>;
}

function ErrorNotice({ error, onDismiss }: { error: ApiError; onDismiss: () => void }) {
  const fields = Object.entries(error.fields).filter(([name]) => name !== "detail");
  return <div role="alert" aria-live="assertive" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold">We couldn’t save this step</p><p className="mt-1 text-sm text-rose-800">{error.message}</p>{fields.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-800">{fields.flatMap(([name, messages]) => messages.map((message) => <li key={`${name}-${message}`}><span className="font-semibold">{label(name)}:</span> {message}</li>))}</ul>}</div><button type="button" onClick={onDismiss} className="text-xs font-bold text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">Dismiss</button></div></div>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label: text, ...inputProps } = props; return <label className="text-xs font-semibold text-slate-700">{text}<input {...inputProps} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>; }
function Select({ name, label: text, items, defaultValue = "" }: { name: string; label: string; items: [string, string][]; defaultValue?: string }) { return <label className="text-xs font-semibold text-slate-700">{text}<select name={name} required defaultValue={defaultValue} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"><option value="" disabled>Select {text.toLowerCase()}</option>{items.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
export function Status({ value }: { value: string }) { const tone = value === "closed" ? "bg-emerald-50 text-emerald-700" : value === "cancelled" ? "bg-rose-50 text-rose-700" : value === "delivered" || value === "discharging" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-700"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label(value)}</span>; }
