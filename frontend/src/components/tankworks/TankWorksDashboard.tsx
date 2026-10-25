"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  CoatingInspection,
  CrewEquipmentUtilization,
  SludgeWasteManifest,
  TankFieldJob,
  TankWorksSummary,
  tankWorksApi,
} from "@/lib/api";

type CreateMode = "job" | "manifest" | "inspection" | "utilization" | null;
type ActiveTab = "jobs" | "manifests" | "inspections" | "utilization";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

export function TankWorksDashboard() {
  const [summary, setSummary] = useState<TankWorksSummary | null>(null);
  const [jobs, setJobs] = useState<TankFieldJob[]>([]);
  const [manifests, setManifests] = useState<SludgeWasteManifest[]>([]);
  const [inspections, setInspections] = useState<CoatingInspection[]>([]);
  const [utilizations, setUtilizations] = useState<CrewEquipmentUtilization[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("jobs");
  const [mode, setMode] = useState<CreateMode>(null);
  const [saving, setSaving] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Transition Modal State
  const [transitionJob, setTransitionJob] = useState<{ job: TankFieldJob; action: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [sum, jobList, manList, inspList, utilList] = await Promise.all([
        tankWorksApi.summary(),
        tankWorksApi.jobs(),
        tankWorksApi.manifests(),
        tankWorksApi.inspections(),
        tankWorksApi.utilization(),
      ]);
      setSummary(sum);
      setJobs(jobList.results);
      setManifests(manList.results);
      setInspections(inspList.results);
      setUtilizations(utilList.results);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("TankWorks data could not be loaded.", 0));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleCreateJob = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await tankWorksApi.createJob({
        client_name: field(data, "client_name"),
        terminal_or_facility: field(data, "terminal_or_facility"),
        tank_identifier: field(data, "tank_identifier"),
        tank_capacity_m3: field(data, "tank_capacity_m3") || null,
        scope_of_work: field(data, "scope_of_work"),
        estimated_cost_minor: Math.round(parseFloat(field(data, "estimated_cost") || "0") * 100),
        currency: field(data, "currency") || "NGN",
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to create tank field job.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleRecordManifest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await tankWorksApi.recordManifest({
        job_id: field(data, "job_id"),
        waste_classification: field(data, "waste_classification"),
        quantity: field(data, "quantity"),
        unit_of_measure: field(data, "unit_of_measure") || "metric_tonnes",
        transporter_name: field(data, "transporter_name"),
        vehicle_registration: field(data, "vehicle_registration"),
        driver_name: field(data, "driver_name"),
        nesrea_permit_number: field(data, "nesrea_permit_number"),
        disposal_facility: field(data, "disposal_facility"),
        treatment_method: field(data, "treatment_method"),
        is_consignment_signed: data.get("is_consignment_signed") === "on",
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to record waste manifest.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleRecordInspection = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await tankWorksApi.recordInspection({
        job_id: field(data, "job_id"),
        surface_location: field(data, "surface_location"),
        blast_standard: field(data, "blast_standard"),
        surface_profile_microns: field(data, "surface_profile_microns"),
        coating_system: field(data, "coating_system"),
        specified_dft_microns: parseInt(field(data, "specified_dft_microns"), 10),
        measured_min_dft_microns: parseInt(field(data, "measured_min_dft_microns"), 10),
        measured_avg_dft_microns: parseInt(field(data, "measured_avg_dft_microns"), 10),
        measured_max_dft_microns: parseInt(field(data, "measured_max_dft_microns"), 10),
        adhesion_test_method: field(data, "adhesion_test_method"),
        adhesion_result_mpa: field(data, "adhesion_result_mpa") || null,
        ambient_temp_c: field(data, "ambient_temp_c") || null,
        steel_temp_c: field(data, "steel_temp_c") || null,
        relative_humidity_percent: field(data, "relative_humidity_percent") || null,
        dew_point_c: field(data, "dew_point_c") || null,
        inspector_name: field(data, "inspector_name"),
        nace_level: field(data, "nace_level"),
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to record coating inspection.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleLogUtilization = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await tankWorksApi.logUtilization({
        job_id: field(data, "job_id"),
        entry_date: field(data, "entry_date"),
        personnel_role: field(data, "personnel_role"),
        headcount: parseInt(field(data, "headcount") || "1", 10),
        man_hours: field(data, "man_hours"),
        equipment_description: field(data, "equipment_description"),
        equipment_hours: field(data, "equipment_hours") || "0.00",
        consumables_used: field(data, "consumables_used"),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to log resource utilization.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteTransition = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transitionJob) return;
    setActionInProgress(transitionJob.job.id);
    const data = new FormData(e.currentTarget);
    try {
      const permitData =
        transitionJob.action === "activate"
          ? {
              safepass_permit_ref: field(data, "safepass_permit_ref"),
              gas_test_cleared: data.get("gas_test_cleared") === "on",
            }
          : undefined;

      await tankWorksApi.transitionJob(
        transitionJob.job.id,
        transitionJob.action,
        transitionJob.job.version,
        field(data, "reason"),
        permitData,
      );
      setTransitionJob(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to transition tank job.", 0));
    } finally {
      setActionInProgress(null);
    }
  };

  const statusBadge = (status: TankFieldJob["status"]) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">Draft</span>;
      case "permit_pending":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">Permit Pending</span>;
      case "active":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800/60 animate-pulse">In Progress</span>;
      case "inspection":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-950/60 text-purple-300 border border-purple-800/60">QA / QC Inspection</span>;
      case "completed":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">Completed</span>;
      case "cancelled":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/60">Cancelled</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-lg shadow-inner">
              TK
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">TankWorks</h1>
              <p className="text-sm text-muted-foreground">
                Industrial tank evacuation, abrasive blasting, internal lining QA/QC, and SafePass interlocks
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode("job")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-colors"
          >
            <span>+</span> New Tank Job
          </button>
          <button
            onClick={() => setMode("manifest")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-colors"
          >
            <span>+</span> Log Sludge Manifest
          </button>
          <button
            onClick={() => setMode("inspection")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-colors"
          >
            <span>+</span> Record Coating QA/QC
          </button>
          <button
            onClick={() => setMode("utilization")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-colors"
          >
            <span>+</span> Log Crew Utilization
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-950/40 border border-rose-800/60 p-4 text-sm text-rose-300 flex items-center justify-between">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">×</button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Active Field Operations</span>
            <span className="text-amber-400">●</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary?.active_jobs ?? 0}</span>
            <span className="text-xs text-muted-foreground">of {summary?.total_jobs ?? 0} total jobs</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {summary?.permit_pending_jobs ?? 0} waiting SafePass clearance
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Hazardous Sludge Evacuated</span>
            <span className="text-blue-400">◈</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary?.total_waste_evacuated_qty ?? "0.00"}</span>
            <span className="text-xs text-muted-foreground">Tonnes</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            NESREA hazardous waste manifest verified
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Coating QA/QC Compliance</span>
            <span className="text-emerald-400">✓</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {summary ? `${summary.passed_coating_inspections} / ${summary.total_coating_inspections}` : "0 / 0"}
            </span>
            <span className="text-xs text-emerald-400">
              {summary && summary.total_coating_inspections > 0
                ? `${Math.round((summary.passed_coating_inspections / summary.total_coating_inspections) * 100)}% pass`
                : "100%"}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            SSPC-PA 2 DFT & ASTM D4541 Adhesion
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Resource Utilization</span>
            <span className="text-amber-400">⚙</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary?.total_man_hours ?? "0.00"}</span>
            <span className="text-xs text-muted-foreground">Man-Hours</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {summary?.total_equipment_hours ?? "0.00"} Compressor/Sprayer run-hours
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/40">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "jobs"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Tank Field Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("manifests")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "manifests"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Sludge & Waste Manifests ({manifests.length})
          </button>
          <button
            onClick={() => setActiveTab("inspections")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "inspections"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Coating QA/QC & DFT ({inspections.length})
          </button>
          <button
            onClick={() => setActiveTab("utilization")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "utilization"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Crew & Equipment Utilization ({utilizations.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Tank Field Jobs */}
      {activeTab === "jobs" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-3">Job Number</th>
                    <th className="px-4 py-3">Client & Terminal</th>
                    <th className="px-4 py-3">Tank Identifier</th>
                    <th className="px-4 py-3">Scope of Work</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">SafePass Interlock</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3 text-right">Workflow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No tank field jobs recorded. Click &quot;+ New Tank Job&quot; to initialize a project scope.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-amber-400">{job.job_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{job.client_name}</div>
                          <div className="text-[11px] text-muted-foreground">{job.terminal_or_facility}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{job.tank_identifier}</span>
                          {job.tank_capacity_m3 && (
                            <div className="text-[11px] text-muted-foreground">{job.tank_capacity_m3} m³</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{label(job.scope_of_work)}</td>
                        <td className="px-4 py-3">{statusBadge(job.status)}</td>
                        <td className="px-4 py-3">
                          {job.gas_test_cleared ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                              ✓ {job.safepass_permit_ref || "Gas Cleared"}
                            </span>
                          ) : job.safepass_permit_ref ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
                              ⚠ {job.safepass_permit_ref} (Gas Test Pending)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No Permit</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {job.currency} {(job.estimated_cost_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {job.allowed_actions.map((act) => (
                              <button
                                key={act}
                                disabled={actionInProgress === job.id}
                                onClick={() => setTransitionJob({ job, action: act })}
                                className="px-2 py-1 rounded bg-muted hover:bg-accent text-foreground text-[11px] font-medium border border-border/60 transition-colors"
                              >
                                {label(act)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sludge & Waste Manifests */}
      {activeTab === "manifests" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-3">Manifest #</th>
                    <th className="px-4 py-3">Job Reference</th>
                    <th className="px-4 py-3">Waste Category</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Transporter & Truck</th>
                    <th className="px-4 py-3">NESREA Permit</th>
                    <th className="px-4 py-3">Disposal Facility</th>
                    <th className="px-4 py-3">Consignment Signed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {manifests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No sludge waste manifests recorded.
                      </td>
                    </tr>
                  ) : (
                    manifests.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-amber-400">{m.manifest_number}</td>
                        <td className="px-4 py-3 font-mono">{m.job_number}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{label(m.waste_classification)}</td>
                        <td className="px-4 py-3 font-mono font-semibold">
                          {m.quantity} {m.unit_of_measure}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{m.transporter_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {m.vehicle_registration} • {m.driver_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{m.nesrea_permit_number || "Pending"}</td>
                        <td className="px-4 py-3">
                          <div className="text-foreground">{m.disposal_facility}</div>
                          <div className="text-[11px] text-muted-foreground">{m.treatment_method}</div>
                        </td>
                        <td className="px-4 py-3">
                          {m.is_consignment_signed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                              ✓ Counter-signed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">
                              Awaiting Sign-off
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Coating QA/QC & DFT */}
      {activeTab === "inspections" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-3">Job Reference</th>
                    <th className="px-4 py-3">Surface Location</th>
                    <th className="px-4 py-3">Blast Prep & Profile</th>
                    <th className="px-4 py-3">Coating System</th>
                    <th className="px-4 py-3">DFT Specified vs Actual</th>
                    <th className="px-4 py-3">Adhesion Test</th>
                    <th className="px-4 py-3">Inspector & NACE</th>
                    <th className="px-4 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {inspections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No coating inspection records logged.
                      </td>
                    </tr>
                  ) : (
                    inspections.map((i) => (
                      <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-amber-400">{i.job_number}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{i.surface_location}</td>
                        <td className="px-4 py-3">
                          <div className="text-foreground">{i.blast_standard}</div>
                          <div className="text-[11px] text-muted-foreground">Profile: {i.surface_profile_microns} µm</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{i.coating_system}</td>
                        <td className="px-4 py-3 font-mono">
                          <span className="text-foreground font-medium">{i.measured_avg_dft_microns} µm</span>
                          <span className="text-[11px] text-muted-foreground"> (Spec: {i.specified_dft_microns} µm)</span>
                          <div className="text-[10px] text-muted-foreground">
                            Min: {i.measured_min_dft_microns} µm • Max: {i.measured_max_dft_microns} µm
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {i.adhesion_result_mpa ? (
                            <div>
                              <span className="font-mono font-semibold text-foreground">{i.adhesion_result_mpa} MPa</span>
                              <div className="text-[10px] text-muted-foreground">{i.adhesion_test_method}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Visual QA only</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{i.inspector_name}</div>
                          <div className="text-[11px] text-muted-foreground">{i.nace_level}</div>
                        </td>
                        <td className="px-4 py-3">
                          {i.passed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                              ✓ Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/60">
                              ✕ Non-conformance
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Crew & Equipment Utilization */}
      {activeTab === "utilization" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Job Reference</th>
                    <th className="px-4 py-3">Personnel Role</th>
                    <th className="px-4 py-3">Headcount</th>
                    <th className="px-4 py-3">Man-Hours</th>
                    <th className="px-4 py-3">Equipment</th>
                    <th className="px-4 py-3">Equipment Hours</th>
                    <th className="px-4 py-3">Consumables Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {utilizations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No resource utilization entries logged.
                      </td>
                    </tr>
                  ) : (
                    utilizations.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">{u.entry_date}</td>
                        <td className="px-4 py-3 font-mono font-medium text-amber-400">{u.job_number}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{u.personnel_role}</td>
                        <td className="px-4 py-3 font-mono">{u.headcount}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">{u.man_hours} hrs</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.equipment_description}</td>
                        <td className="px-4 py-3 font-mono">{u.equipment_hours} hrs</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{u.consumables_used || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Job */}
      {mode === "job" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Initialize Tank Field Project</h2>
            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Client Name *</label>
                  <input
                    name="client_name"
                    required
                    placeholder="e.g. Shell Petroleum Development Co."
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Terminal / Facility *</label>
                  <input
                    name="terminal_or_facility"
                    required
                    placeholder="e.g. Bonny Terminal Tank Farm"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Tank Identifier *</label>
                  <input
                    name="tank_identifier"
                    required
                    placeholder="e.g. TK-06-CRUDE"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Capacity (m³)</label>
                  <input
                    name="tank_capacity_m3"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Scope of Work *</label>
                  <select
                    name="scope_of_work"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  >
                    <option value="evac_cleaning">Sludge Evacuation & Tank Cleaning</option>
                    <option value="blast_coat">Abrasive Blasting & Recoating</option>
                    <option value="full_refurb">Complete Overhaul (Cleaning, Blasting, Recoating)</option>
                    <option value="inspect_repair">API 653 Out-of-Service Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Estimated Budget (NGN)</label>
                  <input
                    name="estimated_cost"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 45000000"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Operational Scope Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Specify abrasive blast standard (SA 2.5), coating system requirements, safety gas testing protocols..."
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Creating Project..." : "Initialize Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Waste Manifest */}
      {mode === "manifest" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Log Hazardous Sludge Waste Manifest</h2>
            <form onSubmit={handleRecordManifest} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">Target Tank Job *</label>
                <select
                  name="job_id"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.job_number} - {j.tank_identifier} ({j.client_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Waste Classification *</label>
                  <select
                    name="waste_classification"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  >
                    <option value="hydrocarbon_sludge">Tank Bottom Heavy Hydrocarbon Sludge</option>
                    <option value="contaminated_water">Oily Wash Water / Effluent</option>
                    <option value="spent_grit">Spent Copper Slag / Blasting Grit</option>
                    <option value="rust_scale">Corrosion Scale & Solids</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Quantity (Metric Tonnes) *</label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 35.50"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Transporter Name *</label>
                  <input
                    name="transporter_name"
                    required
                    placeholder="e.g. Dangote Logistics"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Vehicle Plate *</label>
                  <input
                    name="vehicle_registration"
                    required
                    placeholder="e.g. RSH-492-XA"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Driver Name *</label>
                  <input
                    name="driver_name"
                    required
                    placeholder="e.g. Musa Ibrahim"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">NESREA Permit Number</label>
                  <input
                    name="nesrea_permit_number"
                    placeholder="e.g. NESREA/HAZ/2026/099"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Disposal Facility *</label>
                  <input
                    name="disposal_facility"
                    required
                    placeholder="e.g. Port Harcourt TDU Facility"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Treatment Method</label>
                <input
                  name="treatment_method"
                  defaultValue="Thermal Desorption & Bioremediation"
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  name="is_consignment_signed"
                  type="checkbox"
                  id="manifest_signed"
                  className="rounded border-border text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="manifest_signed" className="text-xs text-foreground font-medium">
                  Consignment note counter-signed by HSE officer and hauler
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Recording..." : "Record Manifest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Coating Inspection */}
      {mode === "inspection" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Record Coating QA/QC Inspection</h2>
            <form onSubmit={handleRecordInspection} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">Target Tank Job *</label>
                <select
                  name="job_id"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.job_number} - {j.tank_identifier} ({j.client_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Surface Location *</label>
                  <input
                    name="surface_location"
                    required
                    placeholder="e.g. Internal Shell Course 1 & 2"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Surface Profile (µm) *</label>
                  <input
                    name="surface_profile_microns"
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 75.00"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Blast Standard *</label>
                  <input
                    name="blast_standard"
                    required
                    defaultValue="SSPC-SP 10 / NACE No. 2 (Near-White Metal)"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Coating System *</label>
                  <input
                    name="coating_system"
                    required
                    placeholder="e.g. Jotun Tankguard Plus (2 x 150µm)"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border border-border/40">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Specified DFT (µm) *</label>
                  <input
                    name="specified_dft_microns"
                    type="number"
                    required
                    placeholder="300"
                    className="w-full px-2 py-1.5 rounded bg-card border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Min DFT (µm) *</label>
                  <input
                    name="measured_min_dft_microns"
                    type="number"
                    required
                    placeholder="280"
                    className="w-full px-2 py-1.5 rounded bg-card border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Avg DFT (µm) *</label>
                  <input
                    name="measured_avg_dft_microns"
                    type="number"
                    required
                    placeholder="320"
                    className="w-full px-2 py-1.5 rounded bg-card border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Max DFT (µm) *</label>
                  <input
                    name="measured_max_dft_microns"
                    type="number"
                    required
                    placeholder="360"
                    className="w-full px-2 py-1.5 rounded bg-card border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Adhesion Test Method</label>
                  <input
                    name="adhesion_test_method"
                    defaultValue="ASTM D4541 Dolly Pull-off"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Adhesion Result (MPa)</label>
                  <input
                    name="adhesion_result_mpa"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 14.50"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Inspector Name *</label>
                  <input
                    name="inspector_name"
                    required
                    placeholder="e.g. Engr. Nnamdi Okon"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Certification Level</label>
                  <input
                    name="nace_level"
                    defaultValue="NACE / AMPP Level 2 Certified"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Inspection Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Environmental readings (dew point margin), holiday detector calibration notes..."
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Recording..." : "Record Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Crew Utilization */}
      {mode === "utilization" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Log Crew & Equipment Utilization</h2>
            <form onSubmit={handleLogUtilization} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">Target Tank Job *</label>
                <select
                  name="job_id"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.job_number} - {j.tank_identifier} ({j.client_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Entry Date *</label>
                  <input
                    name="entry_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Headcount *</label>
                  <input
                    name="headcount"
                    type="number"
                    min="1"
                    defaultValue="4"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Total Man-Hours *</label>
                  <input
                    name="man_hours"
                    type="number"
                    step="0.01"
                    required
                    placeholder="36.00"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Personnel Role / Trade *</label>
                <input
                  name="personnel_role"
                  required
                  placeholder="e.g. Abrasive Blaster & Industrial Painter Crew"
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Equipment Description</label>
                  <input
                    name="equipment_description"
                    placeholder="e.g. Ingersoll Rand 750 CFM Compressor"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Equipment Run-Hours</label>
                  <input
                    name="equipment_hours"
                    type="number"
                    step="0.01"
                    defaultValue="0.00"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Consumables Burn Rate</label>
                <textarea
                  name="consumables_used"
                  rows={2}
                  placeholder="e.g. 40 bags copper slag grit, 25L thinner #17, 4 blast nozzles..."
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Logging..." : "Log Utilization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Job Transition & SafePass Interlock */}
      {transitionJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Action: {label(transitionJob.action)}
            </h2>
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              Job: {transitionJob.job.job_number} ({transitionJob.job.tank_identifier})
            </p>

            <form onSubmit={handleExecuteTransition} className="space-y-4 text-xs">
              {transitionJob.action === "activate" && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 space-y-3">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <span>⚠</span> SafePass Confined-Space Entry Interlock
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      SafePass Permit Reference *
                    </label>
                    <input
                      name="safepass_permit_ref"
                      required
                      defaultValue={transitionJob.job.safepass_permit_ref || "PTW-CSE-"}
                      className="w-full px-2 py-1.5 rounded bg-card border border-border text-foreground font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      name="gas_test_cleared"
                      type="checkbox"
                      id="gas_test_cleared_check"
                      required
                      className="rounded border-border text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="gas_test_cleared_check" className="text-xs text-foreground font-medium">
                      Atmospheric gas testing verified (LEL: 0%, O2: 20.9%, H2S: 0 ppm)
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Reason / Operational Note</label>
                <textarea
                  name="reason"
                  rows={2}
                  placeholder="State operational grounds for this status transition..."
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setTransitionJob(null)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === transitionJob.job.id}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium disabled:opacity-50"
                >
                  Confirm {label(transitionJob.action)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
