"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, BunkerNomination, BunkerSummary, bunkerApi } from "@/lib/api";

const statuses = ["", "draft", "confirmed", "sounding_recorded", "bdn_draft", "under_review", "approved", "issued", "cancelled"];

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export function BunkerFlowList() {
  const router = useRouter();
  const [records, setRecords] = useState<BunkerNomination[]>([]);
  const [summary, setSummary] = useState<BunkerSummary | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const [list, totals] = await Promise.all([bunkerApi.list(params.toString()), bunkerApi.summary()]);
      setRecords(list.results);
      setSummary(totals);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "BunkerFlow could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function createNomination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const record = await bunkerApi.create({
        customer_name: field(form, "customer_name"),
        vessel_name: field(form, "vessel_name"),
        imo_number: field(form, "imo_number"),
        port: field(form, "port"),
        product_grade: field(form, "product_grade"),
        nominated_quantity_mt: field(form, "nominated_quantity_mt"),
        delivery_window_start: new Date(field(form, "delivery_window_start")).toISOString(),
        delivery_window_end: new Date(field(form, "delivery_window_end")).toISOString(),
        notes: field(form, "notes"),
      });
      router.push(`/dashboard/bunkerflow/${record.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The nomination could not be created.");
      setSubmitting(false);
    }
  }

  const metrics = [
    ["Active stems", summary?.active_stems ?? "—", "Open operational records"],
    ["Nominated quantity", summary ? `${Number(summary.nominated_quantity_mt).toLocaleString()} MT` : "—", "Across all nominations"],
    ["Issued BDNs", summary?.issued_bdns ?? "—", "Final documents"],
    ["Delivered quantity", summary ? `${Number(summary.delivered_quantity_mt).toLocaleString()} MT` : "—", "From issued BDNs"],
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-sky-700">BunkerFlow</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">Marine fuel delivery</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage each stem from nomination through reviewed measurements and an issued Bunker Delivery Note.</p>
        </div>
        <button type="button" onClick={() => setShowCreate((value) => !value)} className="h-11 rounded-full bg-[#0b1523] px-5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
          {showCreate ? "Close form" : "+ New nomination"}
        </button>
      </header>

      <section aria-label="BunkerFlow summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([title, value, sub]) => (
          <div key={title} className="rounded-[24px] bg-white p-5">
            <p className="text-sm text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </section>

      {showCreate && (
        <section className="rounded-[28px] bg-white p-5 sm:p-6" aria-labelledby="new-nomination-heading">
          <div className="mb-5">
            <h2 id="new-nomination-heading" className="text-lg font-bold text-slate-950">New fuel nomination</h2>
            <p className="mt-1 text-sm text-slate-500">Capture the customer instruction and delivery window. You can review it before confirmation.</p>
          </div>
          <form onSubmit={createNomination} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Input name="customer_name" label="Customer" required />
            <Input name="vessel_name" label="Receiving vessel" required />
            <Input name="imo_number" label="IMO number" placeholder="Optional" />
            <Input name="port" label="Port or delivery location" required />
            <Input name="product_grade" label="Fuel product / grade" required />
            <Input name="nominated_quantity_mt" label="Nominated quantity (MT)" type="number" step="0.001" min="0.001" required />
            <Input name="delivery_window_start" label="Delivery window starts" type="datetime-local" required />
            <Input name="delivery_window_end" label="Delivery window ends" type="datetime-local" required />
            <label className="md:col-span-2 lg:col-span-3 text-xs font-semibold text-slate-700">Operational notes<textarea name="notes" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button disabled={submitting} className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{submitting ? "Creating…" : "Create draft nomination"}</button>
            </div>
          </form>
        </section>
      )}

      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      <section className="overflow-hidden rounded-[28px] bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-slate-950">Nominations and stems</h2><p className="text-xs text-slate-500">Select a record to continue its controlled workflow.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input aria-label="Search nominations" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vessel, customer, reference…" className="h-10 min-w-64 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-sky-500" />
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-500">
              {statuses.map((value) => <option key={value} value={value}>{value ? label(value) : "All statuses"}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Vessel / customer</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Window</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Loading BunkerFlow records…</td></tr> : records.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No nominations match this view.</td></tr> : records.map((record) => (
                <tr
                  key={record.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open nomination ${record.reference}`}
                  onClick={() => router.push(`/dashboard/bunkerflow/${record.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/dashboard/bunkerflow/${record.id}`);
                    }
                  }}
                  className="group cursor-pointer hover:bg-sky-50/60 focus-visible:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                >
                  <td className="px-5 py-4"><span className="font-mono font-bold text-sky-800 group-hover:underline">{record.reference}</span></td>
                  <td className="px-5 py-4"><p className="font-semibold text-slate-900">{record.vessel_name}</p><p className="text-xs text-slate-500">{record.customer_name}</p></td>
                  <td className="px-5 py-4 text-slate-700">{record.product_grade}</td>
                  <td className="px-5 py-4 font-mono text-slate-800">{Number(record.nominated_quantity_mt).toLocaleString()} MT</td>
                  <td className="px-5 py-4 text-xs text-slate-600">{new Date(record.delivery_window_start).toLocaleString()}</td>
                  <td className="px-5 py-4"><Status value={record.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label: text, ...inputProps } = props;
  return <label className="text-xs font-semibold text-slate-700">{text}<input {...inputProps} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>;
}

export function Status({ value }: { value: string }) {
  const tone = value === "issued" ? "bg-emerald-50 text-emerald-700" : value === "cancelled" ? "bg-rose-50 text-rose-700" : value === "under_review" || value === "approved" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-sky-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label(value)}</span>;
}
