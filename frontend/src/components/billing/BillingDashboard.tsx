"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  BillingSummary,
  CommercialInvoice,
  CustomerAccount,
  CustomerStatement,
  InterimPaymentCertificate,
  PaymentReceipt,
  billingApi,
} from "@/lib/api";

type CreateMode = "invoice" | "customer" | "payment" | "ipc" | null;
type ActiveTab = "invoices" | "customers" | "payments" | "ipcs";

interface LineItemDraft {
  source_module: string;
  source_record_id: string;
  description: string;
  quantity: string;
  unit_of_measure: string;
  unit_rate_minor: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

const formatMoney = (minor: number, currency = "NGN") => {
  const amount = (minor || 0) / 100;
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function BillingDashboard() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<CommercialInvoice[]>([]);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [ipcs, setIpcs] = useState<InterimPaymentCertificate[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("invoices");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currencyFilter, setCurrencyFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [mode, setMode] = useState<CreateMode>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Line items state for invoice creation
  const [draftLineItems, setDraftLineItems] = useState<LineItemDraft[]>([
    { source_module: "bunkering", source_record_id: "", description: "Marine bunkering fuel delivery", quantity: "1", unit_of_measure: "MT", unit_rate_minor: "25000000" },
  ]);

  // Modals & Inspections
  const [selectedInvoice, setSelectedInvoice] = useState<CommercialInvoice | null>(null);
  const [selectedCustomerStatement, setSelectedCustomerStatement] = useState<CustomerStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [certifyIpcTarget, setCertifyIpcTarget] = useState<InterimPaymentCertificate | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (currencyFilter) params.append("currency", currencyFilter);
      if (searchQuery) params.append("search", searchQuery);

      const [sum, invRes, custRes, pmtRes, ipcRes] = await Promise.all([
        billingApi.summary(),
        billingApi.invoices(params.toString()),
        billingApi.customers(),
        billingApi.payments(),
        billingApi.ipcs(),
      ]);
      setSummary(sum);
      setInvoices(invRes.results);
      setCustomers(custRes.results);
      setPayments(pmtRes.results);
      setIpcs(ipcRes.results);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Commercial data could not be loaded.", 0));
    }
  }, [statusFilter, currencyFilter, searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const addLineItem = () => {
    setDraftLineItems((prev) => [
      ...prev,
      { source_module: "haulage", source_record_id: "", description: "", quantity: "1", unit_of_measure: "unit", unit_rate_minor: "1000000" },
    ]);
  };

  const removeLineItem = (index: number) => {
    setDraftLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, key: keyof LineItemDraft, val: string) => {
    setDraftLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: val };
      return copy;
    });
  };

  const handleCreateCustomer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await billingApi.createCustomer({
        name: field(data, "name"),
        tax_id: field(data, "tax_id"),
        contact_email: field(data, "contact_email"),
        contact_phone: field(data, "contact_phone"),
        billing_address: field(data, "billing_address"),
        credit_limit_minor: Number(field(data, "credit_limit_minor") || "0") * 100,
        currency: field(data, "currency") || "NGN",
        payment_terms_days: Number(field(data, "payment_terms_days") || "30"),
      });
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to register customer account", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const line_items = draftLineItems.map((item) => ({
        source_module: item.source_module,
        source_record_id: item.source_record_id,
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure,
        unit_rate_minor: Math.round(Number(item.unit_rate_minor)),
      }));

      await billingApi.createInvoice({
        customer_id: field(data, "customer_id"),
        currency: field(data, "currency") || "NGN",
        vat_percent: field(data, "vat_percent") || "7.50",
        wht_percent: field(data, "wht_percent") || "5.00",
        due_date: field(data, "due_date") || undefined,
        notes: field(data, "notes"),
        line_items,
      });
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to generate commercial invoice", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleIssueInvoice = async (invoice: CommercialInvoice) => {
    setSaving(true);
    setError(null);
    try {
      await billingApi.invoiceAction(invoice.id, "issue", invoice.version, "Issued to customer for payment");
      await load();
      if (selectedInvoice && selectedInvoice.id === invoice.id) {
        const updated = await billingApi.invoice(invoice.id);
        setSelectedInvoice(updated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to issue invoice", 400));
    } finally {
      setSaving(false);
    }
  };

  const handlePostPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const invoiceId = field(data, "invoice_id");
      await billingApi.recordPayment({
        customer_id: field(data, "customer_id"),
        invoice_id: invoiceId || undefined,
        payment_method: field(data, "payment_method"),
        transaction_reference: field(data, "transaction_reference"),
        amount_minor: Math.round(Number(field(data, "amount")) * 100),
        currency: field(data, "currency") || "NGN",
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to record payment receipt", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateIpc = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await billingApi.createIpc({
        customer_id: field(data, "customer_id"),
        contract_reference: field(data, "contract_reference"),
        project_name: field(data, "project_name"),
        valuation_period_start: field(data, "valuation_period_start"),
        valuation_period_end: field(data, "valuation_period_end"),
        currency: field(data, "currency") || "NGN",
        gross_certified_minor: Math.round(Number(field(data, "gross_amount")) * 100),
        retention_percent: field(data, "retention_percent") || "5.00",
        advance_recovery_minor: Math.round(Number(field(data, "advance_recovery") || "0") * 100),
        notes: field(data, "notes"),
      });
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to create Interim Payment Certificate", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleCertifyIpc = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!certifyIpcTarget) return;
    setSaving(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      await billingApi.ipcAction(certifyIpcTarget.id, "certify", certifyIpcTarget.version, {
        qs_sign_off_by: field(data, "qs_sign_off_by"),
        reason: field(data, "reason"),
      });
      setCertifyIpcTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to sign off IPC certification", 400));
    } finally {
      setSaving(false);
    }
  };

  const handleApproveIpc = async (ipc: InterimPaymentCertificate) => {
    setSaving(true);
    setError(null);
    try {
      await billingApi.ipcAction(ipc.id, "approve", ipc.version, { reason: "Approved by Project Director" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Failed to approve IPC", 400));
    } finally {
      setSaving(false);
    }
  };

  const viewCustomerStatement = async (cust: CustomerAccount) => {
    setStatementLoading(true);
    try {
      const stmt = await billingApi.customerStatement(cust.id);
      setSelectedCustomerStatement(stmt);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError("Could not load customer statement", 400));
    } finally {
      setStatementLoading(false);
    }
  };

  const getInvoiceStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "draft":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">Draft</span>;
      case "issued":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/50 text-blue-300 border border-blue-700">Issued</span>;
      case "partially_paid":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-900/50 text-amber-300 border border-amber-700">Partially Paid</span>;
      case "paid":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">Paid</span>;
      case "overdue":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">Overdue</span>;
      case "cancelled":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-neutral-900 text-neutral-400 border border-neutral-700">Void</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-300">{label(statusStr)}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-slate-400">Total Invoiced</p>
          <p className="text-xl font-bold text-white mt-1">
            {summary ? formatMoney(summary.total_billed_minor, "NGN") : "-"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{summary?.total_invoices_count ?? 0} invoices total</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-emerald-400">Total Collected</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {summary ? formatMoney(summary.total_collected_minor, "NGN") : "-"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{summary?.paid_invoices_count ?? 0} invoices settled</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-amber-400">Total Receivables</p>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {summary ? formatMoney(summary.total_outstanding_minor, "NGN") : "-"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Open balances</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-rose-400">Overdue Invoices</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{summary?.overdue_invoices_count ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">Past due date</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-indigo-400">Active Clients</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{summary?.total_customers_count ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">IOC &amp; EPC accounts</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase font-medium text-blue-400">EPC IPCs</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{summary?.total_ipcs_count ?? 0}</p>
          <p className="text-xs text-slate-500 mt-0.5">{summary?.approved_ipcs_count ?? 0} approved</p>
        </div>
      </div>

      {/* Tabs and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "invoices"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Commercial Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "customers"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Client Accounts &amp; Ageing ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "payments"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Payment Receipts ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab("ipcs")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === "ipcs"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-800/60 text-slate-400 hover:text-white"
            }`}
          >
            Interim Payment Certificates ({ipcs.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "invoices" && (
            <button
              onClick={() => setMode("invoice")}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Create Invoice
            </button>
          )}
          {activeTab === "customers" && (
            <button
              onClick={() => setMode("customer")}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Register Client
            </button>
          )}
          {activeTab === "payments" && (
            <button
              onClick={() => setMode("payment")}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Post Payment Receipt
            </button>
          )}
          {activeTab === "ipcs" && (
            <button
              onClick={() => setMode("ipc")}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
            >
              + Draft IPC
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-sm flex items-center justify-between">
          <span>{error.message}</span>
          <button onClick={() => setError(null)} className="text-xs uppercase underline">Dismiss</button>
        </div>
      )}

      {/* TAB 1: Commercial Invoices */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <input
              type="text"
              placeholder="Search invoice number, client name, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Invoice Statuses</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Currencies</option>
              <option value="NGN">NGN — Nigerian Naira</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer / IOC</th>
                    <th className="px-4 py-3">Issue Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Total (Gross)</th>
                    <th className="px-4 py-3">Balance Due</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No commercial invoices found.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-white">{inv.invoice_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">{inv.customer_name}</p>
                          <p className="text-xs text-slate-400">{inv.customer_code}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{inv.issue_date}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-300">{inv.due_date}</td>
                        <td className="px-4 py-3 font-mono font-medium text-white">
                          {formatMoney(inv.total_amount_minor, inv.currency)}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          {inv.balance_due_minor > 0 ? (
                            <span className="text-amber-400">{formatMoney(inv.balance_due_minor, inv.currency)}</span>
                          ) : (
                            <span className="text-emerald-400">Settled</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{getInvoiceStatusBadge(inv.status)}</td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-xs font-medium border border-slate-700 transition"
                          >
                            Details
                          </button>
                          {inv.status === "draft" && (
                            <button
                              onClick={() => handleIssueInvoice(inv)}
                              disabled={saving}
                              className="px-2.5 py-1 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 rounded text-xs font-medium border border-blue-700 transition"
                            >
                              Issue
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

      {/* TAB 2: Customer Accounts & Ageing */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Client Code</th>
                    <th className="px-4 py-3">Client / Company Name</th>
                    <th className="px-4 py-3">TIN / Tax ID</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Credit Limit</th>
                    <th className="px-4 py-3">Payment Terms</th>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3 text-right">Statement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No customer commercial accounts registered.
                      </td>
                    </tr>
                  ) : (
                    customers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-300">{cust.customer_code}</td>
                        <td className="px-4 py-3 font-semibold text-white">{cust.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{cust.tax_id || "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          <p>{cust.contact_email}</p>
                          <p>{cust.contact_phone}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">
                          {formatMoney(cust.credit_limit_minor, cust.currency)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">{cust.payment_terms_days} days</td>
                        <td className="px-4 py-3 font-mono text-xs text-white">{cust.currency}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => viewCustomerStatement(cust)}
                            disabled={statementLoading}
                            className="px-2.5 py-1 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 rounded text-xs font-medium border border-indigo-700 transition"
                          >
                            Statement &amp; Ageing &rarr;
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

      {/* TAB 3: Payment Receipts */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Receipt #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Invoice Ref</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Transaction Ref</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No payment receipts posted yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-300">{pmt.receipt_number}</td>
                        <td className="px-4 py-3 font-semibold text-white">{pmt.customer_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-400">{pmt.invoice_number || "Direct On-Account"}</td>
                        <td className="px-4 py-3 text-xs text-slate-300">{label(pmt.payment_method)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{pmt.transaction_reference}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-300">{pmt.payment_date}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                          {formatMoney(pmt.amount_minor, pmt.currency)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{pmt.recorded_by_name || "Commercial Staff"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Interim Payment Certificates */}
      {activeTab === "ipcs" && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">IPC Number</th>
                    <th className="px-4 py-3">Project &amp; Contract</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Valuation Period</th>
                    <th className="px-4 py-3">Gross Certified</th>
                    <th className="px-4 py-3">Retention (5%)</th>
                    <th className="px-4 py-3">Net Payable</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ipcs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No EPC Interim Payment Certificates recorded.
                      </td>
                    </tr>
                  ) : (
                    ipcs.map((ipc) => (
                      <tr key={ipc.id} className="hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 font-mono font-bold text-white">{ipc.ipc_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">{ipc.project_name}</p>
                          <p className="text-xs text-indigo-400 font-mono">{ipc.contract_reference}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">{ipc.customer_name}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">
                          {ipc.valuation_period_start} &rarr; {ipc.valuation_period_end}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">{formatMoney(ipc.gross_certified_minor, ipc.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-rose-400">-{formatMoney(ipc.retention_amount_minor, ipc.currency)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                          {formatMoney(ipc.net_certified_minor, ipc.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800">
                            {label(ipc.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          {ipc.status === "draft" && (
                            <button
                              onClick={() => setCertifyIpcTarget(ipc)}
                              className="px-2.5 py-1 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 rounded text-xs font-medium border border-indigo-700 transition"
                            >
                              QS Certify
                            </button>
                          )}
                          {ipc.status === "qs_certified" && (
                            <button
                              onClick={() => handleApproveIpc(ipc)}
                              disabled={saving}
                              className="px-2.5 py-1 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 rounded text-xs font-medium border border-emerald-700 transition"
                            >
                              Approve
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

      {/* MODAL 1: Create Invoice */}
      {mode === "invoice" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Generate Commercial Invoice</h3>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateInvoice} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Customer / Operator</label>
                  <select name="customer_id" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.currency})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
                  <select name="currency" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
                  <input type="date" name="due_date" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">VAT % (Statutory 7.5%)</label>
                  <input name="vat_percent" placeholder="7.50" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">WHT % (Withholding 5%)</label>
                  <input name="wht_percent" placeholder="5.00" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Operational Line Items</h4>
                  <button type="button" onClick={addLineItem} className="text-xs text-indigo-300 hover:text-white">+ Add Item</button>
                </div>

                {draftLineItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <select
                        value={item.source_module}
                        onChange={(e) => updateLineItem(idx, "source_module", e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="bunkering">BunkerFlow (Fuel Delivery)</option>
                        <option value="haulage">HaulTrac (Freight Haulage)</option>
                        <option value="tank_works">TankWorks (Cleaning &amp; Coating)</option>
                        <option value="pipe_integrity">PipeIntegrity (Hydrotest/Inspection)</option>
                        <option value="epc_link">EPC-Link (Material Supply)</option>
                        <option value="marine_stores">MarineStores (Spares &amp; Consumables)</option>
                      </select>
                      <input
                        placeholder="Source Ref (BDN / Waybill #)"
                        value={item.source_record_id}
                        onChange={(e) => updateLineItem(idx, "source_record_id", e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      />
                      <input
                        placeholder="Description"
                        value={item.description}
                        required
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white md:col-span-1"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2 items-center">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      />
                      <input
                        placeholder="UoM (MT, km, job)"
                        value={item.unit_of_measure}
                        onChange={(e) => updateLineItem(idx, "unit_of_measure", e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                      />
                      <input
                        placeholder="Unit Rate Minor (Kobo/Cents)"
                        value={item.unit_rate_minor}
                        onChange={(e) => updateLineItem(idx, "unit_rate_minor", e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                      {draftLineItems.length > 1 && (
                        <button type="button" onClick={() => removeLineItem(idx)} className="text-xs text-rose-400 hover:text-rose-300">Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes &amp; Wire Payment Instructions</label>
                <textarea name="notes" rows={2} placeholder="Remit to Zenith Bank Account..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMode(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">
                  {saving ? "Generating..." : "Generate Invoice Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Register Client Account */}
      {mode === "customer" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Register Commercial Client</h3>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Company / Operator Name</label>
                <input name="name" required placeholder="e.g. Chevron Nigeria Limited" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tax ID / TIN</label>
                  <input name="tax_id" placeholder="TIN-009182" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Currency</label>
                  <select name="currency" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                  <input type="email" name="contact_email" placeholder="commercial@chevron.local" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                  <input name="contact_phone" placeholder="+234 803 000 0000" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Credit Limit (Major Units)</label>
                  <input type="number" name="credit_limit_minor" placeholder="50000000" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Terms (Days)</label>
                  <input type="number" name="payment_terms_days" placeholder="30" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Billing Address</label>
                <textarea name="billing_address" rows={2} placeholder="Lekki Peninsula, Lagos..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMode(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">
                  {saving ? "Registering..." : "Register Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Post Payment Receipt */}
      {mode === "payment" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Post Payment Receipt</h3>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handlePostPayment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Customer</label>
                <select name="customer_id" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customer_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Allocate to Invoice (Optional)</label>
                <select name="invoice_id" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                  <option value="">Direct On-Account Payment</option>
                  {invoices.filter((i) => i.balance_due_minor > 0).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.invoice_number} — Bal: {formatMoney(i.balance_due_minor, i.currency)} ({i.customer_name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                  <select name="payment_method" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    <option value="bank_transfer">Direct Bank Transfer / NIP</option>
                    <option value="paystack_link">Paystack Payment Link</option>
                    <option value="flutterwave_link">Flutterwave Gateway</option>
                    <option value="cheque">Bank Draft / Cheque</option>
                    <option value="cash">Cash / Petty Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Amount (Major Units)</label>
                  <input type="number" step="0.01" name="amount" required placeholder="5000000.00" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Transaction Reference / CBN NIP Ref</label>
                <input name="transaction_reference" required placeholder="e.g. NIP-20261025-998812" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes</label>
                <textarea name="notes" rows={2} placeholder="Remittance advice verified..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMode(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">
                  {saving ? "Posting..." : "Post Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Draft Interim Payment Certificate */}
      {mode === "ipc" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Draft EPC Interim Payment Certificate</h3>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateIpc} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Client</label>
                  <select name="customer_id" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white">
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Contract Reference</label>
                  <input name="contract_reference" required placeholder="e.g. EPC-BONGA-NORTH-04" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Project Name</label>
                <input name="project_name" required placeholder="e.g. Bonga North Deepwater Tie-back" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valuation Period Start</label>
                  <input type="date" name="valuation_period_start" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valuation Period End</label>
                  <input type="date" name="valuation_period_end" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Gross Certified (Major)</label>
                  <input type="number" step="0.01" name="gross_amount" required placeholder="50000000.00" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Retention %</label>
                  <input name="retention_percent" placeholder="5.00" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Advance Recovery</label>
                  <input type="number" step="0.01" name="advance_recovery" placeholder="0" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Valuation Notes</label>
                <textarea name="notes" rows={2} placeholder="Scope milestone verification..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setMode(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">
                  {saving ? "Drafting..." : "Draft IPC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: QS Sign-off IPC */}
      {certifyIpcTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">QS Certification Sign-Off</h3>
                <p className="text-xs text-indigo-400 font-mono mt-0.5">{certifyIpcTarget.ipc_number}</p>
              </div>
              <button onClick={() => setCertifyIpcTarget(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCertifyIpc} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Lead Quantity Surveyor Name</label>
                <input name="qs_sign_off_by" required placeholder="e.g. Engr. M. Ibrahim, NIQS" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Verification Endorsement</label>
                <textarea name="reason" rows={3} placeholder="Site measurement and milestone progress verified against approved BOQ..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setCertifyIpcTarget(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">
                  {saving ? "Signing..." : "Sign QS Certificate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Customer Statement of Account & Ageing Report */}
      {selectedCustomerStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedCustomerStatement.customer_name}</h3>
                <p className="text-xs text-indigo-400 font-mono mt-0.5">
                  Statement of Account &bull; Total Due: {formatMoney(selectedCustomerStatement.total_outstanding_minor, selectedCustomerStatement.currency)}
                </p>
              </div>
              <button onClick={() => setSelectedCustomerStatement(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            {/* Ageing Analysis Ribbon */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Accounts Receivable Ageing Analysis</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <p className="text-[11px] text-emerald-400 uppercase font-medium">Current (0–30d)</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {formatMoney(selectedCustomerStatement.ageing.current_0_30_minor, selectedCustomerStatement.currency)}
                  </p>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <p className="text-[11px] text-amber-400 uppercase font-medium">31–60 Days</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {formatMoney(selectedCustomerStatement.ageing.overdue_31_60_minor, selectedCustomerStatement.currency)}
                  </p>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <p className="text-[11px] text-rose-400 uppercase font-medium">61–90 Days</p>
                  <p className="text-sm font-bold text-white font-mono mt-0.5">
                    {formatMoney(selectedCustomerStatement.ageing.overdue_61_90_minor, selectedCustomerStatement.currency)}
                  </p>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <p className="text-[11px] text-red-500 uppercase font-medium">&gt;90 Days Overdue</p>
                  <p className="text-sm font-bold text-red-400 font-mono mt-0.5">
                    {formatMoney(selectedCustomerStatement.ageing.overdue_90_plus_minor, selectedCustomerStatement.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Ledger */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Ref</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Debit (Inv)</th>
                    <th className="px-3 py-2 text-right">Credit (Pmt)</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedCustomerStatement.ledger.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-mono">{entry.date}</td>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-300">{entry.reference}</td>
                      <td className="px-3 py-2 text-slate-300">{entry.description}</td>
                      <td className="px-3 py-2 text-right font-mono text-white">
                        {entry.debit_minor > 0 ? formatMoney(entry.debit_minor, selectedCustomerStatement.currency) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-400">
                        {entry.credit_minor > 0 ? formatMoney(entry.credit_minor, selectedCustomerStatement.currency) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-amber-300">
                        {formatMoney(entry.running_balance_minor, selectedCustomerStatement.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedCustomerStatement(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Invoice Details & Line Items */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedInvoice.invoice_number}</h3>
                <p className="text-xs text-indigo-400 font-semibold">{selectedInvoice.customer_name} &bull; {selectedInvoice.customer_code}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block">Issue Date:</span>
                <span className="font-mono text-white">{selectedInvoice.issue_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Due Date:</span>
                <span className="font-mono text-white">{selectedInvoice.due_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status:</span>
                {getInvoiceStatusBadge(selectedInvoice.status)}
              </div>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2">Module / Ref</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Rate</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedInvoice.line_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-indigo-300 font-mono">
                        {item.source_module ? `${label(item.source_module)}: ${item.source_record_id || "-"}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-white">{item.description}</td>
                      <td className="px-3 py-2 font-mono">{item.quantity} {item.unit_of_measure}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatMoney(item.unit_rate_minor, selectedInvoice.currency)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-white">
                        {formatMoney(item.amount_minor, selectedInvoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs text-slate-300 pt-2 border-t border-slate-800 max-w-xs ml-auto font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="text-white">{formatMoney(selectedInvoice.subtotal_minor, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">VAT ({selectedInvoice.vat_percent}%):</span>
                <span className="text-emerald-400">+{formatMoney(selectedInvoice.vat_amount_minor, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">WHT ({selectedInvoice.wht_percent}% at source):</span>
                <span className="text-rose-400">({formatMoney(selectedInvoice.wht_amount_minor, selectedInvoice.currency)})</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-700">
                <span className="text-white">Total Gross:</span>
                <span className="text-white">{formatMoney(selectedInvoice.total_amount_minor, selectedInvoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-amber-400">Balance Due:</span>
                <span className="text-amber-400">{formatMoney(selectedInvoice.balance_due_minor, selectedInvoice.currency)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              {selectedInvoice.status === "draft" && (
                <button
                  onClick={() => handleIssueInvoice(selectedInvoice)}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  Issue Invoice Now
                </button>
              )}
              <div className="ml-auto">
                <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
