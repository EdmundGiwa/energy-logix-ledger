import { ModulePage } from "@/components/dashboard/ModulePage";

export default function ComplianceShieldPage() {
  return (
    <ModulePage
      color="#4f46e5"
      name="Compliance Shield"
      fullName="Regulatory Calendar"
      desc="Single calendar for NCDMB, NUPRC, NMDPRA, NIMASA, NPA, and ISO renewals with automatic alerts at 90, 60, 30, and 7 days. Instant audit pack generation."
      stats={[
        { label: "Compliance Score", value: "96%", sub: "Across all 6 regulators" },
        { label: "Active Permits", value: "38", sub: "Fully certified" },
        { label: "Renewals <30 Days", value: "3", sub: "Submissions drafted" },
        { label: "Audit Packs", value: "14", sub: "Export-ready dossiers" },
      ]}
      initialRecords={[
        {
          id: "REG-NCDMB-2026",
          title: "NCDMB Annual Company Registration & NCFCC",
          subtitle: "Statutory Local Content Certification",
          metric: "Valid until 15 Nov 2027",
          status: "Verified",
          date: "Today, 10:00 WAT",
          tag: "NCDMB Cert",
          detail: "NCFCC compliance certificate attached. Nigerian workforce quota at 94% exceeds statutory benchmark.",
        },
        {
          id: "REG-NUPRC-2026",
          title: "NUPRC Oilfield & Pipeline Services Permit",
          subtitle: "Specialized Category: Hydrotesting & Pigging",
          metric: "Renewal in 24 Days",
          status: "Pending",
          date: "Today, 08:30 WAT",
          tag: "NUPRC Permit",
          detail: "Renewal dossier compiled with tax clearance, DPR equipment calibration, and safety case submitted to portal.",
        },
        {
          id: "REG-NMDPRA-2026",
          title: "NMDPRA Petroleum Storage & Wholesale Licence",
          subtitle: "Depot & Bunkering Offtake Authorization",
          metric: "Valid until 30 Jun 2027",
          status: "Verified",
          date: "Yesterday, 14:00 WAT",
          tag: "NMDPRA Licence",
          detail: "Annual terminal safety and metering inspection completed by NMDPRA zonal surveillance team.",
        },
        {
          id: "REG-ISO-2026",
          title: "ISO 9001, 14001 & 45001 Integrated IMS Audit",
          subtitle: "Bureau Veritas Annual Surveillance Audit",
          metric: "Zero Non-Conformances",
          status: "Verified",
          date: "Yesterday, 11:20 WAT",
          tag: "ISO Audit",
          detail: "Quality, Environmental, and Occupational Safety systems recertified through 2028 with commendations.",
        },
      ]}
      sections={[
        {
          title: "Unified Regulatory Calendar",
          items: [
            "Single calendar for NCDMB, NUPRC, NMDPRA, NIMASA, NPA, and ISO renewals",
            "Automatic notification alerts at 90, 60, 30, and 7-day countdown thresholds",
            "Document vault for permits, CAC certificates, tax clearances, and insurance",
            "Statutory fee tracking and proof of payment archives",
          ],
        },
        {
          title: "Audit Pack Generator",
          items: [
            "Audit pack generation customized per regulator or IOC tender format",
            "Evidence trail for ISO 9001 (Quality), ISO 14001 (Environment), and ISO 45001 (Safety)",
            "Automated compilation of equipment calibration certificates and personnel training",
            "Exportable tamper-evident PDF bundles with digital verification QR codes",
          ],
        },
        {
          title: "Risk & Expiry Interlocks",
          items: [
            "Automatic operational blocks when critical operating licences expire",
            "Escalation pathways to Managing Director and Legal counsel",
            "Historical compliance log with immutable audit trail for external auditors",
          ],
        },
      ]}
      quickActions={[
        { label: "New Permit", desc: "Upload and schedule a regulatory renewal" },
        { label: "Generate Audit Pack", desc: "Bundle certificates for regulator inspection" },
        { label: "Review Expiries", desc: "Filter permits expiring in next 30/60 days" },
        { label: "ISO Audit Evidence", desc: "Export ISO 9001/14001/45001 compliance binder" },
        { label: "Regulatory Contact", desc: "Look up zonal officer and submission portal" },
        { label: "Statutory Ledger", desc: "View levy and renewal fee payment receipts" },
      ]}
    />
  );
}
