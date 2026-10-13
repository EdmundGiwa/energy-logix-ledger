import { ModulePage } from "@/components/dashboard/ModulePage";

export default function BillingPage() {
  return (
    <ModulePage
      color="#64748b"
      name="Billing"
      fullName="Billing & Commercial"
      desc="Cross-module job costing, Interim Payment Certificates (IPC) for EPC contracts, dual-currency invoices (NGN and USD) with exchange rate snapshots, and payment link gateways."
      stats={[
        { label: "Billed This Month", value: "₦184.2M", sub: "$124,500 USD dual ledger" },
        { label: "Outstanding (AR)", value: "₦28.4M", sub: "92% current <30 days" },
        { label: "Active IPCs", value: "4", sub: "Shell & Chevron EPC" },
        { label: "FX Snapshot Rate", value: "₦1,480", sub: "Fixed per contract rate" },
      ]}
      initialRecords={[
        {
          id: "IPC-2026-004",
          title: "Interim Payment Certificate #04 — Escravos Tie-in",
          subtitle: "Client: Chevron Nigeria Ltd • Milestone: Hydrotest Complete",
          metric: "$482,000.00 USD (₦713.3M)",
          status: "Verified",
          date: "Today, 10:10 WAT",
          tag: "EPC IPC",
          detail: "Progress measurement confirmed by Chevron Company Representative. 10% retention applied in line with contract.",
        },
        {
          id: "INV-2026-1182",
          title: "Bunker Delivery Invoice: MT Sea Venture Stem",
          subtitle: "1,250 MT VLSFO 0.5% • Terms: 14 Days Net",
          metric: "$781,250.00 USD",
          status: "Verified",
          date: "Today, 09:00 WAT",
          tag: "Bunker Invoice",
          detail: "e-BDN BDN-2026-0419 attached as commercial delivery evidence. Wire transfer details dispatched to buyer treasury.",
        },
        {
          id: "INV-2026-0941",
          title: "Bulk Haulage Freight Invoice: Lekki Offtake",
          subtitle: "Client: Nipco Marketers • 12 Dispatches Reconciled",
          metric: "₦14,850,000 NGN",
          status: "Verified",
          date: "Yesterday, 16:30 WAT",
          tag: "Haulage Freight",
          detail: "Includes digital weighbridge receipts and customer POD slips. Payment link via Flutterwave/Paystack attached.",
        },
        {
          id: "STMT-2026-003",
          title: "Aged Debtors Ledger & Statement: TotalEnergies",
          subtitle: "Egina FPSO Field Supply Services",
          metric: "₦0 Overdue (>60 Days)",
          status: "Verified",
          date: "Yesterday, 13:00 WAT",
          tag: "AR Statement",
          detail: "Customer reconciliation statement generated with dual-currency conversion snapshot.",
        },
      ]}
      sections={[
        {
          title: "EPC Interim Payment Certificates (IPC)",
          items: [
            "Milestone verification for subsea, pipeline, and gantry construction works",
            "Cumulative quantity and percentage progress billing against BOQ / Schedule of Rates",
            "Retention accounting (5% or 10%) with automated release schedule",
            "Multi-signature workflow: Contractor Project Manager, QA/QC, and Client Representative",
          ],
        },
        {
          title: "Dual-Currency Commercial Ledger",
          items: [
            "Invoices issued in Naira (NGN) and US Dollars (USD) with exchange rate snapshots",
            "CBN and NUPRC benchmark rate tracking per transaction timestamp",
            "Integrated payment links via Nigerian enterprise gateways (Paystack, Flutterwave)",
            "Automated bank wire transfer advice reconciliation",
          ],
        },
        {
          title: "Job Costing & Profitability",
          items: [
            "Consolidated job costing across fuel, equipment, crew day rates, and consumables",
            "Real-time gross margin tracking per pipeline run, bunker stem, or tank overhaul",
            "Customer statement and ageing reports with automated statement emailing",
          ],
        },
      ]}
      quickActions={[
        { label: "Draft Invoice", desc: "Create NGN or USD commercial invoice" },
        { label: "New IPC Certificate", desc: "Generate interim progress certificate for EPC" },
        { label: "Customer Statement", desc: "Export accounts receivable ageing summary" },
        { label: "Payment Gateway", desc: "Send secure payment link to client finance" },
        { label: "FX Rate Snapshot", desc: "Update contract benchmark currency rate" },
        { label: "Job Margin Audit", desc: "Analyze profitability across active field jobs" },
      ]}
    />
  );
}
