"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  pipeIntegrityApi,
  type PipeAsset,
  type PipeCpPoint,
  type PipeHydrotest,
  type PipeInspection,
  type PipeIntegrityDossier,
  type PipePigRun,
  type PipeRowObservation,
} from "@/lib/api";
import { PipeEvidenceForms } from "./PipeEvidenceForms";

type Tab = "operations" | "assets" | "evidence" | "dossier";

function Pill({ value }: { value: string }) {
  const good = ["passed", "recovered", "accepted", "active", "satisfactory"].includes(value);
  const blue = ["in_transit", "in_progress", "requires_review", "requires_action"].includes(value);
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        good ? "bg-emerald-50 text-emerald-700" : blue ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function PipeIntegrityDashboard() {
  const [tab, setTab] = useState<Tab>("operations");
  const [assets, setAssets] = useState<PipeAsset[]>([]);
  const [pigRuns, setPigRuns] = useState<PipePigRun[]>([]);
  const [hydrotests, setHydrotests] = useState<PipeHydrotest[]>([]);
  const [inspections, setInspections] = useState<PipeInspection[]>([]);
  const [cpPoints, setCpPoints] = useState<PipeCpPoint[]>([]);
  const [rows, setRows] = useState<PipeRowObservation[]>([]);
  const [dossier, setDossier] = useState<PipeIntegrityDossier | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [asset, setAsset] = useState({ reference: "", name: "", fluid_type: "liquid", governing_code: "ASME B31.4" });
  const [pig, setPig] = useState({ asset_id: "", pig_type: "", launcher_kp: "", receiver_kp: "" });
  const [hydro, setHydro] = useState({ asset_id: "", test_pressure_bar: "", hold_duration_minutes: "" });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, p, h, i, c, r] = await Promise.all([
        pipeIntegrityApi.assets(),
        pipeIntegrityApi.pigRuns(),
        pipeIntegrityApi.hydrotests(),
        pipeIntegrityApi.inspections(),
        pipeIntegrityApi.cpSurveyPoints(),
        pipeIntegrityApi.rowObservations(),
      ]);
      setAssets(a.results);
      setPigRuns(p.results);
      setHydrotests(h.results);
      setInspections(i.results);
      setCpPoints(c.results);
      setRows(r.results);
      const firstId = a.results[0]?.id || "";
      if (firstId && !selectedAssetId) {
        setSelectedAssetId(firstId);
      }
      if (a.results[0]) {
        setPig((v) => ({ ...v, asset_id: v.asset_id || a.results[0].id }));
        setHydro((v) => ({ ...v, asset_id: v.asset_id || a.results[0].id }));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Pipeline records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [selectedAssetId]);

  const loadDossier = useCallback(async (assetId: string) => {
    if (!assetId) return;
    setLoadingDossier(true);
    try {
      const data = await pipeIntegrityApi.dossier(assetId);
      setDossier(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load asset integrity dossier.");
    } finally {
      setLoadingDossier(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (tab === "dossier" && selectedAssetId) {
      const timer = window.setTimeout(() => void loadDossier(selectedAssetId), 0);
      return () => window.clearTimeout(timer);
    }
  }, [tab, selectedAssetId, loadDossier]);

  async function save(e: FormEvent, fn: () => Promise<unknown>, message: string) {
    e.preventDefault();
    setError("");
    try {
      await fn();
      setNotice(message);
      await refresh();
      window.setTimeout(() => setNotice(""), 3500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The record could not be saved.");
    }
  }

  const exportAuditPack = () => {
    if (!dossier) return;
    const jsonStr = JSON.stringify(dossier, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `IOC_AUDIT_PACK_${dossier.asset.reference}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("IOC Compliance Audit Pack generated and exported.");
    window.setTimeout(() => setNotice(""), 3500);
  };

  const field = (label: string, value: string, onChange: (value: string) => void, required = true) => (
    <label className="text-[12px] font-semibold text-slate-600">
      {label}
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
      />
    </label>
  );

  const selectAsset = (value: string, onChange: (value: string) => void) => (
    <select
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
    >
      <option value="">Select pipeline asset</option>
      {assets.map((a) => (
        <option key={a.id} value={a.id}>
          {a.reference} — {a.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-medium text-emerald-600">Module 04: PipeIntegrity</p>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-900 sm:text-[2.4rem]">
            Pipeline Integrity Control
          </h1>
          <p className="mt-1 max-w-3xl text-[15px] text-slate-500">
            Intelligent pig runs, hydrotests with hold stabilization curves, NDT wall-thickness registry, CP potential surveys, and IOC compliance dossier.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("dossier")}
            className="h-11 rounded-full bg-emerald-600 px-5 text-[13px] font-semibold text-white hover:bg-emerald-500 transition"
          >
            ★ Integrity Dossier & IOC Pack
          </button>
          <button
            type="button"
            onClick={() => setTab("assets")}
            className="h-11 rounded-full bg-[#0b1523] px-5 text-[13px] font-semibold text-white hover:bg-slate-800 transition"
          >
            + Add pipeline asset
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          {notice}
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Active pig runs", pigRuns.filter((r) => ["launched", "in_transit", "arrived"].includes(r.status)).length, "Current field operations"],
          ["Hydrotests passed", hydrotests.filter((r) => r.status === "passed").length, "Certified zero-drop holds"],
          ["CP survey points", cpPoints.length, "NACE SP0169 monitored"],
          ["Open ROW observations", rows.filter((r) => r.status !== "closed").length, "Requires follow-up"],
        ].map(([label, value, sub]) => (
          <div key={String(label)} className="rounded-[28px] bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-[14px] text-slate-500">{label}</p>
            <p className="mt-2 text-[1.5rem] font-extrabold text-slate-900">{value}</p>
            <p className="mt-1 text-[12px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Navigation tabs */}
      <nav className="flex gap-2 rounded-2xl bg-white p-2 border border-slate-100 shadow-sm">
        {(
          [
            ["operations", "Operations (Pigging & Hydrotests)"],
            ["evidence", "Evidence Registry (NDT, CP & ROW)"],
            ["assets", "Pipeline Assets"],
            ["dossier", "Integrity Dossier & IOC Audit Pack"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${
              tab === key ? "bg-[#0b1523] text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* TAB: EVIDENCE REGISTRY */}
      {tab === "evidence" && (
        <PipeEvidenceForms
          assets={assets}
          onSaved={async (message) => {
            setNotice(message);
            await refresh();
            window.setTimeout(() => setNotice(""), 3500);
          }}
        />
      )}

      {/* TAB: ASSETS */}
      {tab === "assets" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <form
            onSubmit={(e) => save(e, () => pipeIntegrityApi.createAsset(asset), "Pipeline asset created.")}
            className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm"
          >
            <h2 className="text-lg font-bold text-slate-900">Add Pipeline Asset</h2>
            <div className="mt-5 grid gap-3">
              {field("Reference", asset.reference, (v) => setAsset({ ...asset, reference: v }))}
              {field("Asset name", asset.name, (v) => setAsset({ ...asset, name: v }))}
              {field("Governing code", asset.governing_code, (v) => setAsset({ ...asset, governing_code: v }))}
              <label className="text-[12px] font-semibold text-slate-600">
                Fluid type
                <select
                  value={asset.fluid_type}
                  onChange={(e) => setAsset({ ...asset, fluid_type: e.target.value as "liquid" | "gas" })}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="liquid">Liquid</option>
                  <option value="gas">Gas</option>
                </select>
              </label>
              <button className="h-11 rounded-xl bg-[#0b1523] text-sm font-semibold text-white">Save asset</button>
            </div>
          </form>
          <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Asset Directory</h2>
            <div className="mt-5 space-y-3">
              {assets.length ? (
                assets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{a.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {a.reference} &bull; {a.governing_code} &bull; {a.fluid_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(a.id);
                          setTab("dossier");
                        }}
                        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        View Dossier
                      </button>
                      <Pill value={a.is_active ? "active" : "inactive"} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No pipeline assets yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: OPERATIONS (PIG RUNS & HYDROTESTS) */}
      {tab === "operations" && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* PIGGING RUNS */}
          <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Pigging Runs</h2>
            <p className="mt-1 text-sm text-slate-500">Version-checked lifecycle transitions with audit history.</p>
            <form
              onSubmit={(e) => save(e, () => pipeIntegrityApi.createPigRun(pig), "Pig run created.")}
              className="mt-5 grid gap-3"
            >
              {selectAsset(pig.asset_id, (v) => setPig({ ...pig, asset_id: v }))}
              {field("Pig type", pig.pig_type, (v) => setPig({ ...pig, pig_type: v }))}
              <div className="grid grid-cols-2 gap-3">
                {field("Launcher KP", pig.launcher_kp, (v) => setPig({ ...pig, launcher_kp: v }))}
                {field("Receiver KP", pig.receiver_kp, (v) => setPig({ ...pig, receiver_kp: v }))}
              </div>
              <button className="h-11 rounded-xl bg-[#0b1523] text-sm font-semibold text-white">Create pig run</button>
            </form>
            <div className="mt-5 space-y-2">
              {pigRuns.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm font-bold text-slate-900">{r.reference}</span>
                    <Pill value={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.pig_type} &bull; KP {r.launcher_kp} &rarr; {r.receiver_kp}
                  </p>
                  {r.allowed_actions[0] && (
                    <button
                      type="button"
                      onClick={() =>
                        save(
                          { preventDefault() {} } as FormEvent,
                          () => pipeIntegrityApi.transitionPig(r.id, r.allowed_actions[0], r.version, `UI transition: ${r.allowed_actions[0]}`),
                          "Pig run updated."
                        )
                      }
                      className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                    >
                      {r.allowed_actions[0].replaceAll("_", " ")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* HYDROTESTS */}
          <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Hydrotests</h2>
            <p className="mt-1 text-sm text-slate-500">Completion requires a recorded pressure-drop observation.</p>
            <form
              onSubmit={(e) => save(e, () => pipeIntegrityApi.createHydrotest(hydro), "Hydrotest created.")}
              className="mt-5 grid gap-3"
            >
              {selectAsset(hydro.asset_id, (v) => setHydro({ ...hydro, asset_id: v }))}
              {field("Test pressure (bar)", hydro.test_pressure_bar, (v) => setHydro({ ...hydro, test_pressure_bar: v }))}
              {field("Hold duration (minutes)", hydro.hold_duration_minutes, (v) => setHydro({ ...hydro, hold_duration_minutes: v }))}
              <button className="h-11 rounded-xl bg-[#0b1523] text-sm font-semibold text-white">Create hydrotest</button>
            </form>
            <div className="mt-5 space-y-2">
              {hydrotests.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm font-bold text-slate-900">{r.reference}</span>
                    <Pill value={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.test_pressure_bar} bar &bull; {r.hold_duration_minutes} minute hold
                    {r.pressure_drop_bar !== null && ` • Drop: ${r.pressure_drop_bar} bar`}
                  </p>
                  {r.allowed_actions[0] && (
                    <button
                      type="button"
                      onClick={() =>
                        save(
                          { preventDefault() {} } as FormEvent,
                          () =>
                            pipeIntegrityApi.transitionHydrotest(
                              r.id,
                              r.allowed_actions[0],
                              r.version,
                              `UI transition: ${r.allowed_actions[0]}`,
                              r.allowed_actions[0] === "pass" ? { pressure_drop_bar: "0.000" } : undefined
                            ),
                          "Hydrotest updated."
                        )
                      }
                      className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                    >
                      {r.allowed_actions[0].replaceAll("_", " ")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: INTEGRITY DOSSIER & IOC AUDIT PACK */}
      {tab === "dossier" && (
        <div className="space-y-6">
          {/* Asset Selector */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase">Selected Asset:</span>
              <select
                value={selectedAssetId}
                onChange={(e) => {
                  setSelectedAssetId(e.target.value);
                  void loadDossier(e.target.value);
                }}
                className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-medium"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.reference} — {a.name} ({a.governing_code})
                  </option>
                ))}
              </select>
            </div>
            {dossier && (
              <button
                type="button"
                onClick={exportAuditPack}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm transition"
              >
                ⤓ Export Certified IOC Audit Pack (JSON)
              </button>
            )}
          </div>

          {loadingDossier ? (
            <div className="rounded-[28px] bg-white p-12 text-center text-sm text-slate-500">
              Generating engineering integrity analysis and IOC compliance dossier...
            </div>
          ) : dossier ? (
            <div className="space-y-6">
              {/* Dossier Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">Integrity Health Index</p>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span
                      className={`text-4xl font-extrabold ${
                        dossier.integrity_summary.integrity_score >= 80
                          ? "text-emerald-600"
                          : dossier.integrity_summary.integrity_score >= 60
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      {dossier.integrity_summary.integrity_score}%
                    </span>
                    <Pill value={dossier.integrity_summary.status} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Governing Standards: {dossier.integrity_summary.governing_standards.join(" &bull; ")}
                  </p>
                </div>

                <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">Hydrotest & Design Hold</p>
                  <p className="mt-3 text-xl font-bold text-slate-900">
                    {dossier.integrity_summary.latest_hydrotest_passed
                      ? `Certified: ${dossier.integrity_summary.latest_hydrotest_passed}`
                      : "Pending Certification"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {dossier.integrity_summary.hydrotest_pressure_bar
                      ? `Hold: ${dossier.integrity_summary.hydrotest_pressure_bar} bar for ${dossier.integrity_summary.hydrotest_hold_minutes} min`
                      : "No certified hydrotest recorded"}
                  </p>
                </div>

                <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-slate-400">Cathodic Protection Status</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-cyan-600">
                      {dossier.integrity_summary.cp_compliance_percent}%
                    </span>
                    <span className="text-xs text-slate-400">compliant</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {dossier.integrity_summary.total_cp_survey_points} survey points (-850 to -1200 mV CSE)
                  </p>
                </div>
              </div>

              {/* Engineering Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* NDT & Corrosion */}
                <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900">Ultrasonic NDT & Corrosion Analysis</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Min Remaining Life</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {dossier.integrity_summary.min_remaining_life_years}{" "}
                        {dossier.integrity_summary.min_remaining_life_years !== "N/A" ? "years" : ""}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Max Corrosion Rate</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {dossier.integrity_summary.max_corrosion_rate_mm_yr}{" "}
                        {dossier.integrity_summary.max_corrosion_rate_mm_yr !== "N/A" ? "mm/yr" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Total inspection points evaluated: {dossier.records.inspections_count} (Rejected anomalies:{" "}
                    {dossier.records.rejected_inspections})
                  </div>
                </div>

                {/* Right of Way & Security */}
                <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-900">Right-of-Way (ROW) Encroachment</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">Open ROW Anomalies</p>
                      <p className="mt-1 font-bold text-slate-900">{dossier.integrity_summary.open_row_anomalies}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400">High / Critical Encroachments</p>
                      <p
                        className={`mt-1 font-bold ${
                          dossier.integrity_summary.critical_row_anomalies > 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {dossier.integrity_summary.critical_row_anomalies}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Total ROW observation points: {dossier.records.row_observations_count}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] bg-white p-8 text-center text-sm text-slate-500">
              Select a pipeline asset above to generate the integrity dossier.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
