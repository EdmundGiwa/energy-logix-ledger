"use client";

import { useState, type ReactNode } from "react";
import { SeismicBand } from "./Patterns";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export type Stat = { label: string; value: string; sub: string };
export type QuickAction = { label: string; desc: string };
export type OperationalRecord = {
  id: string;
  title: string;
  subtitle: string;
  metric: string;
  status: "Verified" | "Active" | "Pending" | "Flagged";
  date: string;
  tag?: string;
  detail?: string;
};

/* ------------------------------------------------------------------ */
/* Shared module page component                                        */
/* ------------------------------------------------------------------ */
export function ModulePage({
  color,
  name,
  fullName,
  desc,
  stats,
  sections,
  quickActions,
  initialRecords,
  extra,
}: {
  color: string;
  name: string;
  fullName: string;
  desc: string;
  stats: Stat[];
  /** Optional module-specific content rendered between the stats row and
   * Operational Workflows (e.g. BunkerFlow's live stem fill gauges). Absent
   * everywhere else, so no other module page is affected. */
  extra?: ReactNode;
  sections: { title: string; items: string[] }[];
  quickActions: QuickAction[];
  initialRecords?: OperationalRecord[];
}) {
  // Default fallback records if module page doesn't supply them
  const defaultRecords: OperationalRecord[] = initialRecords || [
    {
      id: `${name.substring(0, 3).toUpperCase()}-2026-001`,
      title: `${name} Standard Operation #1`,
      subtitle: "Verified against standard operating procedures",
      metric: "100% Validated",
      status: "Verified",
      date: "Today, 11:20 WAT",
      tag: "Standard",
      detail: "Full audit trail captured with GPS coordinate timestamp and digital supervisor sign-off.",
    },
    {
      id: `${name.substring(0, 3).toUpperCase()}-2026-002`,
      title: `${name} Operational Dispatch #2`,
      subtitle: "Offshore/Onshore active deployment",
      metric: "In Progress",
      status: "Active",
      date: "Today, 09:45 WAT",
      tag: "Active Field",
      detail: "Telematics telemetry and pressure hold telemetry actively streaming to edge node.",
    },
    {
      id: `${name.substring(0, 3).toUpperCase()}-2026-003`,
      title: `${name} Review Batch #3`,
      subtitle: "Awaiting QA/QC approval",
      metric: "Pending Sign-off",
      status: "Pending",
      date: "Yesterday, 17:10 WAT",
      tag: "QA Hold",
      detail: "Submitted for second-tier managerial review before export to regulatory pack.",
    },
  ];

  const [records, setRecords] = useState<OperationalRecord[]>(defaultRecords);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "Verified" | "Active" | "Pending" | "Flagged">("all");
  const [selectedRecord, setSelectedRecord] = useState<OperationalRecord | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newMetric, setNewMetric] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const filteredRecords = records.filter((r) => {
    const matchesTab = filterTab === "all" || r.status === filterTab;
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newRec: OperationalRecord = {
      id: `${name.substring(0, 3).toUpperCase()}-2026-${Math.floor(Math.random() * 900 + 100)}`,
      title: newTitle,
      subtitle: newSubtitle || "Manual field entry via PetroLedger OS",
      metric: newMetric || "Verified Entry",
      status: "Active",
      date: "Just now",
      tag: "Field Log",
      detail: "Recorded on local node and queued for delta sync with cloud ledger.",
    };

    setRecords([newRec, ...records]);
    setNewModalOpen(false);
    setNewTitle("");
    setNewSubtitle("");
    setNewMetric("");
    setToastMsg(`Record ${newRec.id} logged successfully!`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-slate-900 border border-slate-800 text-white px-5 py-3 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[13px] font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <SeismicBand className="absolute -top-8 right-[14%] hidden h-[150px] w-[55%] lg:block" />
        <div className="relative">
          <span
            className="inline-flex items-center gap-2 text-[13px] font-medium"
            style={{ color: color }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {name}
          </span>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-900 sm:text-[2.4rem]">
            {fullName}
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] text-slate-500">{desc}</p>
        </div>

        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#0b1523] px-5 text-[13.5px] font-medium text-white transition hover:bg-slate-800"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New {name} Record
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-[28px] bg-white p-5 transition-shadow duration-300 hover:shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)]"
          >
            <p className="text-[14px] text-slate-500">
              {s.label}
            </p>
            <p className="mt-2 text-[1.5rem] font-extrabold tracking-[-0.03em] text-slate-900">
              {s.value}
            </p>
            <p className="mt-1 text-[12px] text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {extra}

      {/* Quick Actions */}
      <div className="rounded-[28px] bg-white p-5">
        <h2 className="text-[14px] font-bold text-slate-900 mb-3.5">Operational Workflows</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              type="button"
              onClick={() => {
                setNewTitle(`${qa.label}`);
                setNewSubtitle(`${qa.desc}`);
                setNewModalOpen(true);
              }}
              className="group flex items-start gap-3 rounded-2xl bg-[#f6f7f9] px-4 py-3.5 text-left transition-all duration-200 hover:bg-slate-100"
            >
              <span
                className="mt-1 h-2.5 w-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
                style={{ backgroundColor: color }}
              />
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{qa.label}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">{qa.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Operational Records Table */}
      <div className="rounded-[28px] bg-white overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">
              Operational Ledger: {name}
            </h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Showing {filteredRecords.length} synchronized field and dispatch records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center rounded-full bg-[#f2f3f5] p-1 text-[12px] font-medium">
              {(["all", "Active", "Verified", "Pending", "Flagged"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`rounded-full px-3 py-1.5 transition ${
                    filterTab === tab
                      ? "bg-[#0b1523] text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === "all" ? "All" : tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex h-10 w-[200px] items-center rounded-full border border-slate-200 bg-white px-4 transition focus-within:border-slate-400">
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-slate-400 shrink-0 mr-2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent text-[12.5px] text-slate-900 placeholder:text-slate-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f6f7f9] text-[13px] text-slate-500">
                <th className="py-3 px-5">Identifier</th>
                <th className="py-3 px-5">Operation / Target</th>
                <th className="py-3 px-5">Measurement / Value</th>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-5">
                      <span className="font-mono font-bold text-slate-900 group-hover:underline">
                        {rec.id}
                      </span>
                      {rec.tag && (
                        <span className="block text-[10.5px] font-mono text-slate-400 mt-0.5">
                          {rec.tag}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900">{rec.title}</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">{rec.subtitle}</p>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-800 font-medium">
                      {rec.metric}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[12px] text-slate-500">
                      {rec.date}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold border ${
                          rec.status === "Verified"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : rec.status === "Active"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : rec.status === "Flagged"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            rec.status === "Verified"
                              ? "bg-emerald-500"
                              : rec.status === "Active"
                              ? "bg-sky-500"
                              : rec.status === "Flagged"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                          }`}
                        />
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(rec);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Features / Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((sec) => (
          <div key={sec.title} className="rounded-[28px] bg-white p-5">
            <h2 className="text-[14px] font-bold text-slate-900 mb-4">{sec.title}</h2>
            <div className="space-y-2.5">
              {sec.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color, opacity: 0.6 }}
                  />
                  <p className="text-[13px] text-slate-600 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedRecord(null)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: color }}
                >
                  {name} Record Inspection
                </span>
                <h3 className="mt-1 text-[17px] font-bold text-slate-900">
                  {selectedRecord.title}
                </h3>
                <p className="text-[12px] font-mono text-slate-400 mt-0.5">
                  ID: {selectedRecord.id} • {selectedRecord.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4 text-[13px]">
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">
                  Specification & Target
                </span>
                <p className="mt-1 font-semibold text-slate-800 text-[14px]">
                  {selectedRecord.subtitle}
                </p>
                <p className="mt-2 text-slate-600 leading-relaxed text-[12.5px]">
                  {selectedRecord.detail || "Field record logged under ISO 9001 and Nigerian regulatory guidelines."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Measurement / Value
                  </span>
                  <p className="mt-1 font-mono font-bold text-slate-900 text-[14px]">
                    {selectedRecord.metric}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Validation State
                  </span>
                  <p className="mt-1 font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {selectedRecord.status}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 text-white p-3 font-mono text-[11px]">
                <span className="text-slate-400 block text-[10px] uppercase">
                  SHA-256 Ledger Audit Seal
                </span>
                <span className="text-emerald-400 break-all">
                  9f8a32b14c8e7629810ea354b8d7219c01f68e9203847529d81726a45b3c2901
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Record Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setNewModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: color }}
                >
                  Create {name} Record
                </span>
                <h3 className="mt-1 text-[16.5px] font-bold text-slate-900">
                  New Operational Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Operation Title / Reference
                </label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Stem Confirmation / Pigging Run #4"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Target Asset / Vessel / Facility
                </label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="e.g. MT Sea Venture / Lekki Depot Gantry"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                  Key Metric / Quantity (MT, Litres, Bar)
                </label>
                <input
                  type="text"
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  placeholder="e.g. 1,420.0 MT @ 15°C / 142 Bar Hold"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-5 py-2 text-[12.5px] font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: color }}
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
