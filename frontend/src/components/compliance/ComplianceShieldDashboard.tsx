"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  AuditNonConformance,
  ComplianceEvidencePack,
  ComplianceSummary,
  IsoManagementSystemAudit,
  RegulatoryCertificate,
  complianceApi,
} from "@/lib/api";

type CreateMode = "certificate" | "isoAudit" | "ncr" | "evidencePack" | null;
type ActiveTab = "certificates" | "isoAudits" | "ncrs" | "evidencePacks";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

export function ComplianceShieldDashboard() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [certificates, setCertificates] = useState<RegulatoryCertificate[]>([]);
  const [isoAudits, setIsoAudits] = useState<IsoManagementSystemAudit[]>([]);
  const [evidencePacks, setEvidencePacks] = useState<ComplianceEvidencePack[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("certificates");
  const [regulatorFilter, setRegulatorFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [mode, setMode] = useState<CreateMode>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Action Modals State
  const [renewalCert, setRenewalCert] = useState<RegulatoryCertificate | null>(null);
  const [verifyCert, setVerifyCert] = useState<RegulatoryCertificate | null>(null);
  const [selectedAuditForNcr, setSelectedAuditForNcr] = useState<IsoManagementSystemAudit | null>(null);
  const [closeNcrItem, setCloseNcrItem] = useState<AuditNonConformance | null>(null);
  const [viewPack, setViewPack] = useState<ComplianceEvidencePack | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (regulatorFilter) params.append("regulator", regulatorFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const [sum, certsRes, auditsRes, packsRes] = await Promise.all([
        complianceApi.summary(),
        complianceApi.certificates(params.toString()),
        complianceApi.isoAudits(),
        complianceApi.evidencePacks(),
      ]);
      setSummary(sum);
      setCertificates(certsRes.results);
      setIsoAudits(auditsRes.results);
      setEvidencePacks(packsRes.results);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Compliance Shield records could not be loaded.", 0));
    }
  }, [regulatorFilter, statusFilter, searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Derived NCRs list from audits
  const allNcrs = isoAudits.flatMap((audit) =>
    (audit.ncrs || []).map((ncr) => ({
      ...ncr,
      auditStandard: audit.standard,
      auditBody: audit.certification_body,
    }))
  );

  const handleRegisterCertificate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await complianceApi.createCertificate({
        regulator: field(data, "regulator"),
        certificate_type: field(data, "certificate_type"),
        certificate_number: field(data, "certificate_number"),
        issuing_authority: field(data, "issuing_authority"),
        issue_date: field(data, "issue_date"),
        expiry_date: field(data, "expiry_date"),
        document_reference: field(data, "document_reference"),
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to register certificate", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRenewal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!renewalCert) return;
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await complianceApi.certificateAction(renewalCert.id, "submit_renewal", {
        renewal_tracking_number: field(data, "renewal_tracking_number"),
        reason: field(data, "reason"),
      });
      setRenewalCert(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to submit renewal application", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCertificate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!verifyCert) return;
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await complianceApi.certificateAction(verifyCert.id, "verify", {
        new_expiry_date: field(data, "new_expiry_date") || undefined,
        reason: field(data, "reason"),
      });
      setVerifyCert(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to verify certificate", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateIsoAudit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await complianceApi.createIsoAudit({
        standard: field(data, "standard"),
        audit_type: field(data, "audit_type"),
        audit_scope: field(data, "audit_scope"),
        certification_body: field(data, "certification_body"),
        lead_auditor: field(data, "lead_auditor"),
        audit_date: field(data, "audit_date"),
        next_audit_due: field(data, "next_audit_due"),
        overall_outcome: field(data, "overall_outcome"),
        certificate_number: field(data, "certificate_number"),
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to record ISO audit", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleLogNcr = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await complianceApi.logNcr({
        audit_id: selectedAuditForNcr ? selectedAuditForNcr.id : field(data, "audit_id"),
        severity: field(data, "severity"),
        finding_description: field(data, "finding_description"),
        root_cause_analysis: field(data, "root_cause_analysis"),
        corrective_action_plan: field(data, "corrective_action_plan"),
        target_closure_date: field(data, "target_closure_date"),
        assigned_to: field(data, "assigned_to"),
      });
      setSelectedAuditForNcr(null);
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to log non-conformance finding", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseNcr = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!closeNcrItem) return;
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await complianceApi.closeNcr(closeNcrItem.id, field(data, "reason"));
      setCloseNcrItem(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to close non-conformance finding", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleCompileEvidencePack = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await complianceApi.compileEvidencePack({
        pack_name: field(data, "pack_name"),
        target_stakeholder: field(data, "target_stakeholder"),
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to compile evidence pack", 400));
    } finally {
      setSaving(false);
    }
  };

  const getUrgencyBadge = (cert: RegulatoryCertificate) => {
    switch (cert.urgency_tier) {
      case "critical_7d":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/60 text-red-300 border border-red-700 animate-pulse">Critical (&le;7d)</span>;
      case "warning_30d":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-900/60 text-amber-300 border border-amber-700">Urgent (&le;30d)</span>;
      case "notice_60d":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900/50 text-yellow-300 border border-yellow-700">Notice (&le;60d)</span>;
      case "upcoming_90d":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/50 text-blue-300 border border-blue-700">Upcoming (&le;90d)</span>;
      case "expired":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">Expired</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">Valid</span>;
    }
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "valid":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700">Active</span>;
      case "renewal_in_progress":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-900/40 text-indigo-300 border border-indigo-700">Renewal Submitted</span>;
      case "expiring_soon":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-900/40 text-amber-300 border border-amber-700">Expiring Soon</span>;
      case "expired":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900/40 text-red-300 border border-red-700">Expired</span>;
      case "suspended":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-600">Suspended</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-300">{label(statusStr)}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner for Critical Expiries */}
      {summary && (summary.critical_alerts_7d > 0 || summary.warning_alerts_30d > 0) && (
        <div className="bg-gradient-to-r from-red-950/80 via-amber-950/70 to-slate-900 border border-red-600/60 rounded-xl p-4 shadow-lg text-white">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <h4 className="font-bold text-red-200 uppercase tracking-wider text-xs">
                  Statutory Expiry Warning &bull; Stop-Work Risk Active
                </h4>
              </div>
              <p className="text-sm text-neutral-300">
                {summary.critical_alerts_7d > 0 && (
                  <span className="font-semibold text-red-300 mr-2">
                    {summary.critical_alerts_7d} certificate(s) expire within 7 days.
                  </span>
                )}
                {summary.warning_alerts_30d > 0 && (
                  <span className="text-amber-300 font-medium">
                    {summary.warning_alerts_30d} certificate(s) expire within 30 days. Action renewal immediately.
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                setStatusFilter("expiring_soon");
                setActiveTab("certificates");
              }}
              className="px-3 py-1.5 rounded-lg bg-red-800/60 hover:bg-red-700 border border-red-500 text-xs font-semibold transition"
            >
              Review Expiries &rarr;
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-slate-400">Total Permits</p>
          <p className="text-2xl font-bold text-white mt-1">{summary?.total_certificates ?? "-"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Across all agencies</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-emerald-400">Active &amp; Compliant</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{summary?.valid_certificates ?? "-"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Certified operational</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-amber-400">Expiring Soon</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{summary?.expiring_soon_certificates ?? "-"}</p>
          <p className="text-xs text-slate-500 mt-0.5">&le; 90-day horizon</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-indigo-400">Renewals Pending</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{summary?.renewal_pending_certificates ?? "-"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Under agency review</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-rose-400">Open ISO NCRs</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{summary?.open_ncrs_count ?? "-"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Corrective actions</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-blue-400">Evidence Packs</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{summary?.total_evidence_packs ?? "-"}</p>
          <p className="text-xs text-slate-500 mt-0.5">Pre-qualification ready</p>
        </div>
      </div>

      {/* Tabs and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("certificates")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "certificates"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Statutory Certificates ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab("isoAudits")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "isoAudits"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            ISO &amp; Management Systems ({isoAudits.length})
          </button>
          <button
            onClick={() => setActiveTab("ncrs")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "ncrs"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Audit NCR Tracker ({allNcrs.length})
          </button>
          <button
            onClick={() => setActiveTab("evidencePacks")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "evidencePacks"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Evidence Packs &amp; Dossiers ({evidencePacks.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "certificates" && (
            <button
              onClick={() => setMode("certificate")}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Register Certificate
            </button>
          )}
          {activeTab === "isoAudits" && (
            <button
              onClick={() => setMode("isoAudit")}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Log ISO Audit
            </button>
          )}
          {activeTab === "ncrs" && (
            <button
              onClick={() => setMode("ncr")}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Log NCR Finding
            </button>
          )}
          {activeTab === "evidencePacks" && (
            <button
              onClick={() => setMode("evidencePack")}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Compile Evidence Pack
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-sm flex items-center justify-between">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="text-xs uppercase underline">Dismiss</button>
        </div>
      )}

      {/* TAB 1: Statutory Certificates */}
      {activeTab === "certificates" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <input
              type="text"
              placeholder="Search permit number, type, issuing body..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={regulatorFilter}
              onChange={(e) => setRegulatorFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Regulators (NUPRC, NIMASA, NMDPRA...)</option>
              <option value="nuprc">NUPRC — Nigerian Upstream</option>
              <option value="nmdpra">NMDPRA — Midstream/Downstream</option>
              <option value="nimasa">NIMASA — Maritime &amp; Safety</option>
              <option value="cabotage">Cabotage Registration</option>
              <option value="ncdmb">NCDMB — Nigerian Content</option>
              <option value="fmenv">FMEnv — Environment</option>
              <option value="firs">FIRS — Tax Clearance</option>
              <option value="cac">CAC — Good Standing</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="valid">Valid / Compliant</option>
              <option value="expiring_soon">Expiring Soon (&le;90d)</option>
              <option value="renewal_in_progress">Renewal in Progress</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Certificates Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Permit &amp; Certificate</th>
                    <th className="px-4 py-3">Regulator</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">Urgency</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Verified By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No statutory certificates found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">{cert.certificate_number}</p>
                          <p className="text-xs text-slate-400">{cert.certificate_type}</p>
                          <p className="text-xs text-slate-500">{cert.issuing_authority}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs uppercase text-indigo-300 font-semibold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                            {cert.regulator}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{cert.issue_date}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-white">{cert.expiry_date}</span>
                          <p className="text-xs text-slate-400">
                            {cert.days_to_expiry < 0
                              ? `${Math.abs(cert.days_to_expiry)}d ago`
                              : `${cert.days_to_expiry} days left`}
                          </p>
                        </td>
                        <td className="px-4 py-3">{getUrgencyBadge(cert)}</td>
                        <td className="px-4 py-3">{getStatusBadge(cert.status)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {cert.verified_by_name ? (
                            <span className="text-emerald-400">&bull; {cert.verified_by_name}</span>
                          ) : (
                            <span className="text-slate-500">Pending verification</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => setRenewalCert(cert)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-xs font-medium border border-slate-700 transition"
                          >
                            Submit Renewal
                          </button>
                          <button
                            onClick={() => setVerifyCert(cert)}
                            className="px-2.5 py-1 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 rounded text-xs font-medium border border-emerald-700 transition"
                          >
                            Verify
                          </button>
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

      {/* TAB 2: ISO & Management Systems */}
      {activeTab === "isoAudits" && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Standard &amp; Scope</th>
                    <th className="px-4 py-3">Audit Type</th>
                    <th className="px-4 py-3">Certification Body</th>
                    <th className="px-4 py-3">Lead Auditor</th>
                    <th className="px-4 py-3">Audit Date</th>
                    <th className="px-4 py-3">Next Due</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3">Open NCRs</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isoAudits.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No ISO audits logged yet.
                      </td>
                    </tr>
                  ) : (
                    isoAudits.map((audit) => (
                      <tr key={audit.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white uppercase">{label(audit.standard)}</p>
                          <p className="text-xs text-slate-400 line-clamp-1">{audit.audit_scope}</p>
                          {audit.certificate_number && (
                            <p className="text-xs font-mono text-indigo-400">Cert: {audit.certificate_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">{label(audit.audit_type)}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-200">{audit.certification_body}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{audit.lead_auditor}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-300">{audit.audit_date}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-300">{audit.next_audit_due}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                            {label(audit.overall_outcome)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {audit.open_ncrs_count > 0 ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              {audit.open_ncrs_count} Open
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-400 font-medium">0 Open</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedAuditForNcr(audit);
                              setMode("ncr");
                            }}
                            className="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 rounded text-xs font-medium border border-rose-700 transition"
                          >
                            + Log NCR
                          </button>
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

      {/* TAB 3: NCR Tracker */}
      {activeTab === "ncrs" && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">NCR Number</th>
                    <th className="px-4 py-3">Standard / Audit</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Finding Description</th>
                    <th className="px-4 py-3">Target Closure</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {allNcrs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Zero non-conformance findings recorded. Audit performance clean.
                      </td>
                    </tr>
                  ) : (
                    allNcrs.map((ncr) => (
                      <tr key={ncr.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 font-mono font-semibold text-white">{ncr.ncr_number}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          <span className="uppercase text-slate-300 font-semibold">{label(ncr.auditStandard)}</span>
                          <p>{ncr.auditBody}</p>
                        </td>
                        <td className="px-4 py-3">
                          {ncr.severity === "major" ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              Major
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800">
                              Minor
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300 max-w-xs">
                          <p className="line-clamp-2">{ncr.finding_description}</p>
                          {ncr.root_cause_analysis && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              Root Cause: {ncr.root_cause_analysis}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{ncr.target_closure_date}</td>
                        <td className="px-4 py-3 text-xs text-slate-300">{ncr.assigned_to}</td>
                        <td className="px-4 py-3">
                          {ncr.status === "closed" ? (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                              Closed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800">
                              Open
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {ncr.status !== "closed" && (
                            <button
                              onClick={() => setCloseNcrItem(ncr)}
                              className="px-2.5 py-1 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 rounded text-xs font-medium border border-emerald-700 transition"
                            >
                              Close Sign-off
                            </button>
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

      {/* TAB 4: Evidence Packs & Dossiers */}
      {activeTab === "evidencePacks" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evidencePacks.length === 0 ? (
              <div className="col-span-full bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
                No compiled pre-qualification evidence packs yet. Click &ldquo;+ Compile Evidence Pack&rdquo; to generate a sealed compliance dossier.
              </div>
            ) : (
              evidencePacks.map((pack) => (
                <div key={pack.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">{pack.pack_name}</h4>
                      <p className="text-xs text-indigo-400 font-medium mt-0.5">Target: {pack.target_stakeholder}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950/60 text-blue-300 border border-blue-800 uppercase">
                      {pack.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{pack.notes || "Compiled statutory compliance dossier."}</p>
                  <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
                    <span>Compiled: {new Date(pack.compiled_at).toLocaleDateString()}</span>
                    <span>By: {pack.compiled_by_name || "QA Staff"}</span>
                  </div>
                  <button
                    onClick={() => setViewPack(pack)}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold border border-slate-700 transition text-center"
                  >
                    View Dossier Snapshot &rarr;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Register Certificate */}
      {mode === "certificate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Register Statutory Certificate</h3>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleRegisterCertificate} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Regulator</label>
                  <select name="regulator" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="nuprc">NUPRC — Nigerian Upstream</option>
                    <option value="nmdpra">NMDPRA — Midstream/Downstream</option>
                    <option value="nimasa">NIMASA — Maritime Administration</option>
                    <option value="cabotage">Cabotage Vessel &amp; Crew Registration</option>
                    <option value="ncdmb">NCDMB — Nigerian Content</option>
                    <option value="fmenv">FMEnv — Ministry of Environment</option>
                    <option value="firs">FIRS — Tax Clearance</option>
                    <option value="cac">CAC — Good Standing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Certificate Number</label>
                  <input name="certificate_number" required placeholder="e.g. NUPRC/PTS/2026/881" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Certificate / Permit Title</label>
                <input name="certificate_type" required placeholder="e.g. Offshore Pipeline Survey &amp; Hydrotesting Permit" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Issuing Authority</label>
                <input name="issuing_authority" required placeholder="e.g. NUPRC Upstream Directorate Abuja" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Issue Date</label>
                  <input type="date" name="issue_date" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Expiry Date</label>
                  <input type="date" name="expiry_date" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Document Reference / Storage Path</label>
                <input name="document_reference" placeholder="e.g. DOC-REG-2026-NUPRC-01.pdf" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes &amp; Conditions</label>
                <textarea name="notes" rows={2} placeholder="Optional operational notes..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMode(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">
                  {saving ? "Registering..." : "Register Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Submit Renewal */}
      {renewalCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Submit Renewal Application</h3>
                <p className="text-xs text-indigo-400 font-mono mt-0.5">{renewalCert.certificate_number}</p>
              </div>
              <button onClick={() => setRenewalCert(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleSubmitRenewal} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Portal Tracking / Receipt Number</label>
                <input name="renewal_tracking_number" required placeholder="e.g. NUPRC-PORTAL-REN-2026-881" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Submission Notes &amp; Payment Ref</label>
                <textarea name="reason" rows={3} placeholder="Application dossier uploaded and fee remitted..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setRenewalCert(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">
                  {saving ? "Recording..." : "Record Renewal Submission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Verify Certificate */}
      {verifyCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Verify Certificate Authenticity</h3>
                <p className="text-xs text-emerald-400 font-mono mt-0.5">{verifyCert.certificate_number}</p>
              </div>
              <button onClick={() => setVerifyCert(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleVerifyCertificate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Updated Expiry Date (Optional)</label>
                <input type="date" name="new_expiry_date" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Verification Verification Reference</label>
                <textarea name="reason" rows={3} placeholder="Cross-checked against official portal registry and stamp verified..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setVerifyCert(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
                  {saving ? "Verifying..." : "Confirm Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Log ISO Audit */}
      {mode === "isoAudit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Log ISO / API Management System Audit</h3>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateIsoAudit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Standard</label>
                  <select name="standard" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="iso_9001">ISO 9001:2015 (QMS)</option>
                    <option value="iso_14001">ISO 14001:2015 (EMS)</option>
                    <option value="iso_45001">ISO 45001:2018 (OH&amp;S)</option>
                    <option value="iso_27001">ISO 27001:2022 (ISMS)</option>
                    <option value="api_spec_q1">API Spec Q1 (Petroleum &amp; Gas)</option>
                    <option value="api_spec_q2">API Spec Q2 (Supply Services)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Audit Type</label>
                  <select name="audit_type" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="surveillance">Annual Surveillance Audit</option>
                    <option value="certification">Initial Certification</option>
                    <option value="internal">Internal Quality Audit</option>
                    <option value="client_qualification">Client Pre-qualification Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Audit Scope</label>
                <input name="audit_scope" required placeholder="e.g. Offshore bunkering, pipeline hydrotesting, yard storage" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Certification Body</label>
                  <input name="certification_body" required placeholder="e.g. Bureau Veritas / DNV GL" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Lead Auditor</label>
                  <input name="lead_auditor" required placeholder="e.g. Engr. K. Adeleke" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Audit Date</label>
                  <input type="date" name="audit_date" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Next Audit Due</label>
                  <input type="date" name="next_audit_due" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Outcome</label>
                  <select name="overall_outcome" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="certified">Certified / Recommended</option>
                    <option value="conditional">Approved with Observations</option>
                    <option value="major_findings">Action Plan Required</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Certificate Number</label>
                  <input name="certificate_number" placeholder="e.g. BV-ISO-9001-2026" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Executive Notes</label>
                <textarea name="notes" rows={2} placeholder="Audit remarks..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMode(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">
                  {saving ? "Recording..." : "Log ISO Audit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Log NCR Finding */}
      {mode === "ncr" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Log Non-Conformance Finding (NCR)</h3>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleLogNcr} className="space-y-4 text-sm">
              {!selectedAuditForNcr && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Select ISO Audit</label>
                  <select name="audit_id" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    {isoAudits.map((a) => (
                      <option key={a.id} value={a.id}>
                        {label(a.standard)} — {a.certification_body} ({a.audit_date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Severity</label>
                  <select name="severity" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="minor">Minor Non-conformance</option>
                    <option value="major">Major Non-conformance</option>
                    <option value="ofi">Opportunity for Improvement (OFI)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Target Closure Date</label>
                  <input type="date" name="target_closure_date" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Finding Description</label>
                <textarea name="finding_description" required rows={2} placeholder="Detailed auditor finding..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Assigned Remediation Owner</label>
                <input name="assigned_to" required placeholder="e.g. Lead Quality Engineer" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMode(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-medium">
                  {saving ? "Logging..." : "Log Finding"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Close NCR Sign-off */}
      {closeNcrItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Close NCR Sign-Off</h3>
                <p className="text-xs text-rose-400 font-mono mt-0.5">{closeNcrItem.ncr_number}</p>
              </div>
              <button onClick={() => setCloseNcrItem(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCloseNcr} className="space-y-4 text-sm">
              <p className="text-xs text-slate-400 bg-slate-800/60 p-3 rounded-lg border border-slate-800">
                Finding: {closeNcrItem.finding_description}
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Verification &amp; Sign-off Notes</label>
                <textarea name="reason" required rows={3} placeholder="Corrective action verified by QA Manager, calibration certificate attached..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setCloseNcrItem(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
                  {saving ? "Closing..." : "Sign Off & Close NCR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: Compile Evidence Pack */}
      {mode === "evidencePack" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Compile IOC Evidence Pack</h3>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCompileEvidencePack} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Pack Title</label>
                <input name="pack_name" required placeholder="e.g. Shell SNEPCo Deepwater Prequalification Dossier" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Stakeholder / Operator</label>
                <input name="target_stakeholder" required placeholder="e.g. Shell Petroleum Development Company (SPDC)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Scope &amp; Compliance Notes</label>
                <textarea name="notes" rows={3} placeholder="Consolidated statutory evidence of valid NUPRC, NIMASA, and ISO certifications..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMode(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">
                  {saving ? "Compiling..." : "Compile &amp; Seal Dossier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: View Evidence Pack Snapshot */}
      {viewPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{viewPack.pack_name}</h3>
                <p className="text-xs text-blue-400 font-medium">Stakeholder: {viewPack.target_stakeholder}</p>
              </div>
              <button onClick={() => setViewPack(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto space-y-2">
              <p className="text-emerald-400">{"// TAMPER-EVIDENT EVIDENCE MANIFEST SNAPSHOT"}</p>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">{JSON.stringify(viewPack.dossier_data, null, 2)}</pre>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setViewPack(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
