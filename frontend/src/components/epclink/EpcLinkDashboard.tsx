"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  ApprovedVendor,
  EpcLinkSummary,
  MaterialIssueSlip,
  MaterialRequisition,
  NigerianContentReport,
  PipeYardItem,
  epcLinkApi,
} from "@/lib/api";

type CreateMode = "requisition" | "yardItem" | "vendor" | "issue" | null;
type ActiveTab = "yard" | "requisitions" | "vendors" | "slips" | "nigerianContent";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

export function EpcLinkDashboard() {
  const [summary, setSummary] = useState<EpcLinkSummary | null>(null);
  const [yardItems, setYardItems] = useState<PipeYardItem[]>([]);
  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([]);
  const [vendors, setVendors] = useState<ApprovedVendor[]>([]);
  const [issueSlips, setIssueSlips] = useState<MaterialIssueSlip[]>([]);
  const [ncReport, setNcReport] = useState<NigerianContentReport | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("yard");
  const [mode, setMode] = useState<CreateMode>(null);
  const [saving, setSaving] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Transition Modal State
  const [transitionReq, setTransitionReq] = useState<{ req: MaterialRequisition; action: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [sum, itemsRes, reqsRes, vendsRes, slipsRes, ncRes] = await Promise.all([
        epcLinkApi.summary(),
        epcLinkApi.yardItems(),
        epcLinkApi.requisitions(),
        epcLinkApi.vendors(),
        epcLinkApi.issueSlips(),
        epcLinkApi.nigerianContentReport(),
      ]);
      setSummary(sum);
      setYardItems(itemsRes.results);
      setRequisitions(reqsRes.results);
      setVendors(vendsRes.results);
      setIssueSlips(slipsRes.results);
      setNcReport(ncRes);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("EPC-Link data could not be loaded.", 0));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleCreateRequisition = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await epcLinkApi.createRequisition({
        project_name: field(data, "project_name"),
        client_name: field(data, "client_name"),
        wbs_code: field(data, "wbs_code"),
        priority: field(data, "priority"),
        required_date: field(data, "required_date"),
        delivery_location: field(data, "delivery_location"),
        estimated_cost_minor: Math.round(parseFloat(field(data, "estimated_cost") || "0") * 100),
        currency: field(data, "currency") || "NGN",
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to create requisition.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateYardItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await epcLinkApi.createYardItem({
        material_type: field(data, "material_type"),
        grade_specification: field(data, "grade_specification"),
        outer_diameter_inches: field(data, "outer_diameter_inches") || null,
        wall_thickness_mm: field(data, "wall_thickness_mm") || null,
        schedule: field(data, "schedule"),
        length_meters: field(data, "length_meters") || "12.00",
        quantity: field(data, "quantity") || "1.00",
        unit_of_measure: field(data, "unit_of_measure") || "joints",
        heat_number: field(data, "heat_number"),
        mill_manufacturer: field(data, "mill_manufacturer"),
        mtc_number: field(data, "mtc_number"),
        mtc_type: field(data, "mtc_type") || "en_10204_3_1",
        yield_strength_mpa: field(data, "yield_strength_mpa") || null,
        tensile_strength_mpa: field(data, "tensile_strength_mpa") || null,
        impact_test_joules: field(data, "impact_test_joules") || null,
        yard_location: field(data, "yard_location"),
        bay_rack_position: field(data, "bay_rack_position"),
        vendor_id: field(data, "vendor_id") || null,
        unit_cost_minor: Math.round(parseFloat(field(data, "unit_cost") || "0") * 100),
        currency: field(data, "currency") || "NGN",
        nigerian_content_percent: field(data, "nigerian_content_percent") || "100.00",
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to intake yard item.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVendor = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await epcLinkApi.createVendor({
        vendor_name: field(data, "vendor_name"),
        category: field(data, "category"),
        status: field(data, "status") || "active",
        audit_rating: field(data, "audit_rating") || "A",
        nogic_jqs_id: field(data, "nogic_jqs_id"),
        nuprc_permit_ref: field(data, "nuprc_permit_ref"),
        iso_certification: field(data, "iso_certification") || "ISO 9001:2015 Certified",
        contact_email: field(data, "contact_email"),
        contact_phone: field(data, "contact_phone"),
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to register vendor.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleIssueMaterial = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await epcLinkApi.issueMaterials({
        requisition_id: field(data, "requisition_id"),
        contractor_name: field(data, "contractor_name"),
        issued_to: field(data, "issued_to"),
        issued_date: field(data, "issued_date") || new Date().toISOString().split("T")[0],
        receiver_signature_ref: field(data, "receiver_signature_ref"),
        notes: field(data, "notes"),
        mark_fulfilled: data.get("mark_fulfilled") === "on",
        items: [
          {
            yard_item_id: field(data, "yard_item_id"),
            quantity_issued: field(data, "quantity_issued"),
            notes: field(data, "item_notes"),
          },
        ],
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to issue materials.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteTransition = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transitionReq) return;
    setActionInProgress(transitionReq.req.id);
    const data = new FormData(e.currentTarget);
    try {
      await epcLinkApi.transitionRequisition(
        transitionReq.req.id,
        transitionReq.action,
        transitionReq.req.version,
        field(data, "reason"),
      );
      setTransitionReq(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to transition requisition.", 0));
    } finally {
      setActionInProgress(null);
    }
  };

  const exportNogicDossier = () => {
    if (!ncReport) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ncReport, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `NCDMB_NOGIC_JQS_AUDIT_DOSSIER_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const reqStatusBadge = (status: MaterialRequisition["status"]) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">Draft</span>;
      case "submitted":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">Review Pending</span>;
      case "approved":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800/60">Approved for Issue</span>;
      case "rejected":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/60">Rejected</span>;
      case "fulfilled":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">Fulfilled</span>;
      case "cancelled":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">Cancelled</span>;
    }
  };

  const yardStatusBadge = (status: PipeYardItem["status"]) => {
    switch (status) {
      case "available":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">Available</span>;
      case "reserved":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60">Reserved</span>;
      case "issued":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-950/60 text-blue-300 border border-blue-800/60">Issued</span>;
      case "quarantine":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-950/60 text-rose-300 border border-rose-800/60">Quarantine (NCR)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 text-lg shadow-inner">
              EP
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">EPC-Link</h1>
              <p className="text-sm text-muted-foreground">
                Procurement, pipe-yard inventory, heat number metallurgy, and NCDMB local content audit packs
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode("requisition")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors"
          >
            <span>+</span> New Requisition
          </button>
          <button
            onClick={() => setMode("yardItem")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-colors"
          >
            <span>+</span> Intake Pipe Yard Item
          </button>
          <button
            onClick={() => setMode("vendor")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-colors"
          >
            <span>+</span> Register Vendor
          </button>
          <button
            onClick={() => setMode("issue")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-colors"
          >
            <span>+</span> Issue Material
          </button>
          <button
            onClick={exportNogicDossier}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 transition-colors"
          >
            <span>⬇</span> Export NOGIC Dossier
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
            <span>Nigerian Content Compliance</span>
            <span className="text-emerald-400">✓</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {summary?.overall_nigerian_content_percent ?? "100.00"}%
            </span>
            <span className="text-xs text-emerald-400 font-medium">NCDMB Target: &ge; 70%</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            In-country fabrication & domestic supply spend
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Pipe-Yard Tubulars & Steel</span>
            <span className="text-cyan-400">◈</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary?.available_yard_items ?? 0}</span>
            <span className="text-xs text-muted-foreground">of {summary?.total_yard_items ?? 0} total tags</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {summary?.reserved_yard_items ?? 0} items reserved for active projects
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Material Requisitions</span>
            <span className="text-amber-400">●</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary?.approved_requisitions ?? 0}</span>
            <span className="text-xs text-muted-foreground">Approved for issue</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {summary?.pending_requisitions ?? 0} under engineering review
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span>Approved Vendor Governance</span>
            <span className="text-blue-400">⚙</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {summary ? `${summary.active_vendors} / ${summary.total_vendors}` : "0 / 0"}
            </span>
            <span className="text-xs text-blue-400 font-medium">Qualified AVL</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {summary?.total_issue_slips ?? 0} total material issue slips dispatched
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/40">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("yard")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "yard"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Pipe-Yard Inventory ({yardItems.length})
          </button>
          <button
            onClick={() => setActiveTab("requisitions")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "requisitions"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Material Requisitions ({requisitions.length})
          </button>
          <button
            onClick={() => setActiveTab("vendors")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "vendors"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Approved Vendor List (AVL) ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab("slips")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "slips"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Material Issue Slips ({issueSlips.length})
          </button>
          <button
            onClick={() => setActiveTab("nigerianContent")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "nigerianContent"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            NCDMB / NOGIC-JQS Audit Pack
          </button>
        </div>
      </div>

      {/* Tab 1: Pipe-Yard Inventory */}
      {activeTab === "yard" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-3">Item Tag</th>
                    <th className="px-4 py-3">Category & Specification</th>
                    <th className="px-4 py-3">OD & Wall Thickness</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Heat # & Mill</th>
                    <th className="px-4 py-3">MTC Certificate</th>
                    <th className="px-4 py-3">Yard Position</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">NC %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {yardItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        No pipe-yard items recorded. Click &quot;+ Intake Pipe Yard Item&quot; to register incoming inventory.
                      </td>
                    </tr>
                  ) : (
                    yardItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-cyan-400">
                          {item.item_tag}
                          <div className="text-[10px] text-muted-foreground font-mono">{item.qr_tag}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{item.grade_specification}</div>
                          <div className="text-[11px] text-muted-foreground">{label(item.material_type)}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {item.outer_diameter_inches ? `${item.outer_diameter_inches}" OD` : "—"}
                          {item.wall_thickness_mm && ` x ${item.wall_thickness_mm} mm WT`}
                          {item.schedule && ` (${item.schedule})`}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {item.quantity} {item.unit_of_measure}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <span className="font-semibold text-foreground">{item.heat_number}</span>
                          <div className="text-[11px] text-muted-foreground">{item.mill_manufacturer}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-foreground">{item.mtc_number}</div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-950/60 text-blue-300 border border-blue-800/60">
                            {label(item.mtc_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.yard_location}</div>
                          <div className="text-[11px] text-muted-foreground">{item.bay_rack_position}</div>
                        </td>
                        <td className="px-4 py-3">{yardStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400 font-medium">
                          {item.nigerian_content_percent}%
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

      {/* Tab 2: Material Requisitions */}
      {activeTab === "requisitions" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-3">Requisition #</th>
                    <th className="px-4 py-3">Project & Client</th>
                    <th className="px-4 py-3">WBS Code</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Required Date</th>
                    <th className="px-4 py-3">Budget</th>
                    <th className="px-4 py-3 text-right">Workflow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {requisitions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No material requisitions recorded.
                      </td>
                    </tr>
                  ) : (
                    requisitions.map((req) => (
                      <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-cyan-400">{req.requisition_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{req.project_name}</div>
                          <div className="text-[11px] text-muted-foreground">{req.client_name}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{req.wbs_code || "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                              req.priority === "emergency"
                                ? "bg-rose-950/60 text-rose-300 border-rose-800/60"
                                : req.priority === "urgent"
                                ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            {label(req.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{reqStatusBadge(req.status)}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{req.required_date}</td>
                        <td className="px-4 py-3 font-mono">
                          {req.currency} {(req.estimated_cost_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {req.allowed_actions.map((act) => (
                              <button
                                key={act}
                                disabled={actionInProgress === req.id}
                                onClick={() => setTransitionReq({ req, action: act })}
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

      {/* Tab 3: Approved Vendor List */}
      {activeTab === "vendors" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-3">Vendor Code</th>
                    <th className="px-4 py-3">Vendor Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Audit Grade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">NOGIC-JQS ID</th>
                    <th className="px-4 py-3">NUPRC Permit</th>
                    <th className="px-4 py-3">ISO Certification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No approved vendors registered.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-cyan-400">{v.vendor_code}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{v.vendor_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{label(v.category)}</td>
                        <td className="px-4 py-3 font-bold">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${
                              v.audit_rating === "A"
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                                : v.audit_rating === "B"
                                ? "bg-blue-950/60 text-blue-300 border-blue-800/60"
                                : "bg-amber-950/60 text-amber-300 border-amber-800/60"
                            }`}
                          >
                            Grade {v.audit_rating}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                            {label(v.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{v.nogic_jqs_id || "Pending"}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{v.nuprc_permit_ref || "Pending"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.iso_certification}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Material Issue Slips */}
      {activeTab === "slips" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-medium">
                  <tr>
                    <th className="px-4 py-3">Issue Slip #</th>
                    <th className="px-4 py-3">Requisition Ref</th>
                    <th className="px-4 py-3">Contractor</th>
                    <th className="px-4 py-3">Receiving Officer</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Sign-off Signature</th>
                    <th className="px-4 py-3">Issued Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground">
                  {issueSlips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No material issue slips logged.
                      </td>
                    </tr>
                  ) : (
                    issueSlips.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-cyan-400">{s.issue_slip_number}</td>
                        <td className="px-4 py-3 font-mono">{s.requisition_number}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{s.contractor_name}</td>
                        <td className="px-4 py-3">{s.issued_to}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{s.issued_date}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">
                          {s.receiver_signature_ref ? `✓ ${s.receiver_signature_ref}` : "Pending Signature"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {s.items.map((it) => (
                              <div key={it.id} className="font-mono text-[11px] text-muted-foreground">
                                • {it.quantity_issued} {it.unit_of_measure} of {it.item_tag} (Heat: {it.heat_number})
                              </div>
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

      {/* Tab 5: Nigerian Content & NCDMB Dossier */}
      {activeTab === "nigerianContent" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-card/60 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  NCDMB & NOGIC-JQS Statutory Compliance Audit Dossier
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reconciled inventory metallurgy, local spend engine, and mill test traceability for {ncReport?.organization_name}
                </p>
              </div>
              <button
                onClick={exportNogicDossier}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Download Certified NOGIC Dossier (JSON)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground uppercase font-medium">Weighted Local Spend</div>
                <div className="mt-2 text-3xl font-bold text-emerald-400">
                  {ncReport?.inventory_summary.overall_nigerian_content_percent}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total Inventory Value: NGN {((ncReport?.inventory_summary.total_inventory_value_minor ?? 0) / 100).toLocaleString()}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground uppercase font-medium">MTC 3.1 / 3.2 Coverage</div>
                <div className="mt-2 text-3xl font-bold text-cyan-400">
                  {ncReport?.mtc_compliance.mtc_3_1_or_3_2_coverage_percent}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  100% heat traceability to EN 10204 certified steel mills
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
                <div className="text-xs text-muted-foreground uppercase font-medium">NOGIC-JQS Registered AVL</div>
                <div className="mt-2 text-3xl font-bold text-blue-400">
                  {ncReport?.vendor_governance.nogic_jqs_registered_vendors} / {ncReport?.vendor_governance.total_approved_vendors}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Vendors registered with valid NCDMB portal IDs
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Material Class Distribution in Yard
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {ncReport?.material_type_distribution.map((dist) => (
                  <div key={dist.material_type} className="p-3 rounded-lg bg-card border border-border/40 text-center">
                    <div className="text-xs font-medium text-foreground">{label(dist.material_type)}</div>
                    <div className="text-lg font-bold text-cyan-400 mt-1">{dist.count}</div>
                    <div className="text-[10px] text-muted-foreground">{dist.total_qty} units in stock</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Requisition */}
      {mode === "requisition" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Create Material Requisition</h2>
            <form onSubmit={handleCreateRequisition} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Project Name *</label>
                  <input
                    name="project_name"
                    required
                    placeholder="e.g. Bonga North Subsea Flowlines"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Client Name *</label>
                  <input
                    name="client_name"
                    required
                    placeholder="e.g. Shell SNEPCo"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">WBS Code</label>
                  <input
                    name="wbs_code"
                    placeholder="e.g. WBS-BN-SUBSEA-04"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Priority *</label>
                  <select
                    name="priority"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="routine">Routine (Standard Lead Time)</option>
                    <option value="urgent">Urgent (Expedited Fabrication)</option>
                    <option value="emergency">Shutdown / Emergency Breakdown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Required Delivery Date *</label>
                  <input
                    name="required_date"
                    type="date"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Delivery Yard / Site *</label>
                  <input
                    name="delivery_location"
                    required
                    placeholder="e.g. Onne Free Zone Pipe Yard Bay 3"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Estimated Budget (NGN)</label>
                <input
                  name="estimated_cost"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 85000000"
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Technical Specification Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="State pipe metallurgy (X65 PSL2), sour service HIC/SSC test requirements, MTC 3.2 cert mandate..."
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Creating Requisition..." : "Create Requisition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Intake Pipe-Yard Item */}
      {mode === "yardItem" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Intake Pipe-Yard Item & MTC</h2>
            <form onSubmit={handleCreateYardItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Material Type *</label>
                  <select
                    name="material_type"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="line_pipe">Carbon & Alloy Steel Line Pipe</option>
                    <option value="casing_tubing">OCTG Casing & Production Tubing</option>
                    <option value="structural">Structural Beams & Plates</option>
                    <option value="flanges_fittings">Flanges, Tees & Elbows</option>
                    <option value="valves">Valves & Actuators</option>
                    <option value="consumables">Welding & Consumables</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Grade / Specification *</label>
                  <input
                    name="grade_specification"
                    required
                    placeholder="e.g. API 5L X65 PSL2 DNV-ST-F101"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Outer Diameter (Inches)</label>
                  <input
                    name="outer_diameter_inches"
                    type="number"
                    step="0.001"
                    placeholder="12.750"
                    className="w-full px-2 py-1.5 rounded bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Wall Thickness (mm)</label>
                  <input
                    name="wall_thickness_mm"
                    type="number"
                    step="0.01"
                    placeholder="19.05"
                    className="w-full px-2 py-1.5 rounded bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Schedule</label>
                  <input
                    name="schedule"
                    placeholder="e.g. SCH 80"
                    className="w-full px-2 py-1.5 rounded bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Quantity *</label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    required
                    defaultValue="50.00"
                    className="w-full px-2 py-1.5 rounded bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Unit *</label>
                  <input
                    name="unit_of_measure"
                    required
                    defaultValue="joints"
                    className="w-full px-2 py-1.5 rounded bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Length (Meters)</label>
                  <input
                    name="length_meters"
                    type="number"
                    step="0.01"
                    defaultValue="12.20"
                    className="w-full px-2 py-1.5 rounded bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border/40">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Heat Number *</label>
                  <input
                    name="heat_number"
                    required
                    placeholder="e.g. HT-772819-B"
                    className="w-full px-2 py-1.5 rounded bg-card border border-border focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Mill Manufacturer *</label>
                  <input
                    name="mill_manufacturer"
                    required
                    placeholder="e.g. Tenaris Confab Steel Mill"
                    className="w-full px-2 py-1.5 rounded bg-card border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">MTC Number *</label>
                  <input
                    name="mtc_number"
                    required
                    placeholder="e.g. MTC-EN10204-3.1-9942"
                    className="w-full px-2 py-1.5 rounded bg-card border border-border focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">MTC Certificate Type *</label>
                  <select
                    name="mtc_type"
                    required
                    className="w-full px-2 py-1.5 rounded bg-card border border-border focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="en_10204_3_1">EN 10204 3.1 Inspection Certificate</option>
                    <option value="en_10204_3_2">EN 10204 3.2 Third-Party Witnessed</option>
                    <option value="standard_mill">Standard Mill Test Report</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Yard Location *</label>
                  <input
                    name="yard_location"
                    required
                    placeholder="e.g. Onne Pipe Yard Base"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Bay / Rack / Tier *</label>
                  <input
                    name="bay_rack_position"
                    required
                    placeholder="e.g. Bay 4 - Rack 2 - Tier 1"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Approved Vendor</label>
                  <select
                    name="vendor_id"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">None / Direct Procurement</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vendor_name} ({v.vendor_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Nigerian Content % *</label>
                  <input
                    name="nigerian_content_percent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue="85.00"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Intaking Item..." : "Intake Yard Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Vendor */}
      {mode === "vendor" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Register Approved Vendor</h2>
            <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">Vendor Name *</label>
                <input
                  name="vendor_name"
                  required
                  placeholder="e.g. Tenaris Global Services Nigeria"
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Supply Category *</label>
                  <select
                    name="category"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="tubulars">Line Pipes, Tubing & Casing</option>
                    <option value="valves">Valves, Actuators & Manifolds</option>
                    <option value="structural">Structural Beams & Plates</option>
                    <option value="fittings_flanges">Flanges & Butt-Weld Fittings</option>
                    <option value="services">NDT, Inspection & Coating Services</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Audit Rating *</label>
                  <select
                    name="audit_rating"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="A">Grade A (High Capability / Low Risk)</option>
                    <option value="B">Grade B (Approved with Minor Observations)</option>
                    <option value="C">Grade C (Audited / Conditional Approval)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">NOGIC-JQS Registration ID</label>
                  <input
                    name="nogic_jqs_id"
                    placeholder="e.g. NOGIC-VND-9921"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">NUPRC Permit Reference</label>
                  <input
                    name="nuprc_permit_ref"
                    placeholder="e.g. NUPRC/PTS/2026/881"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Contact Email</label>
                  <input
                    name="contact_email"
                    type="email"
                    placeholder="e.g. procurement@tenaris.com.ng"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Contact Phone</label>
                  <input
                    name="contact_phone"
                    placeholder="e.g. +234 803 123 4567"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Registering..." : "Register Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Material */}
      {mode === "issue" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Issue Material to Site / Contractor</h2>
            <form onSubmit={handleIssueMaterial} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">Approved Requisition *</label>
                <select
                  name="requisition_id"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                >
                  {requisitions
                    .filter((r) => r.status === "approved")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.requisition_number} - {r.project_name} ({r.client_name})
                      </option>
                    ))}
                </select>
                {requisitions.filter((r) => r.status === "approved").length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    ⚠ No approved requisitions available. Approve a requisition first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Contractor / Installation Company *</label>
                  <input
                    name="contractor_name"
                    required
                    placeholder="e.g. Subsea 7 West Africa Ltd"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Receiving Officer *</label>
                  <input
                    name="issued_to"
                    required
                    placeholder="e.g. Engr. Patrick Bassey (OIM)"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Pipe Yard Item to Dispatch *</label>
                  <select
                    name="yard_item_id"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                  >
                    {yardItems
                      .filter((i) => i.status === "available" || i.status === "reserved")
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.item_tag} - {i.grade_specification} ({i.quantity} {i.unit_of_measure} avail, Heat: {i.heat_number})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-muted-foreground mb-1">Quantity to Issue *</label>
                  <input
                    name="quantity_issued"
                    type="number"
                    step="0.01"
                    required
                    placeholder="15.00"
                    className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-muted-foreground mb-1">Receiver Digital Signature Ref</label>
                <input
                  name="receiver_signature_ref"
                  placeholder="e.g. SIG-SS7-PBASSEY-9901"
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  name="mark_fulfilled"
                  type="checkbox"
                  id="mark_fulfilled_check"
                  className="rounded border-border text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="mark_fulfilled_check" className="text-xs text-foreground font-medium">
                  Mark requisition as fully fulfilled
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
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50"
                >
                  {saving ? "Issuing..." : "Confirm Material Issuance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Requisition Transition */}
      {transitionReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Action: {label(transitionReq.action)}
            </h2>
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              Requisition: {transitionReq.req.requisition_number} ({transitionReq.req.project_name})
            </p>

            <form onSubmit={handleExecuteTransition} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-muted-foreground mb-1">Reason / Technical Note</label>
                <textarea
                  name="reason"
                  rows={2}
                  placeholder="State technical basis for approval, revision grounds, or cancellation..."
                  className="w-full px-3 py-2 rounded-lg bg-muted/60 border border-border focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setTransitionReq(null)}
                  className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === transitionReq.req.id}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50"
                >
                  Confirm {label(transitionReq.action)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
