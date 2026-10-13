import { ModulePage } from "@/components/dashboard/ModulePage";

export default function EPCLinkPage() {
  return (
    <ModulePage
      color="#0891b2"
      name="EPC-Link"
      fullName="Procurement, OCTG & Local Content"
      desc="Material requisition, pipe yard control with heat numbers and MTCs, NCDMB Nigerian Content spend engine, NCFCC readiness checker, and NOGIC-JQS tender dossier export."
      stats={[
        { label: "Local Content Spend", value: "84.2%", sub: "Target: 70% min" },
        { label: "NCFCC Status", value: "Ready", sub: "Annual audit cleared" },
        { label: "OCTG Yard Stock", value: "1,840 MT", sub: "Across 4 bays" },
        { label: "Active Tenders", value: "5", sub: "IOC bid dossiers" },
      ]}
      initialRecords={[
        {
          id: "NCFCC-2026-Q3",
          title: "NCDMB NCFCC Readiness Check Dossier",
          subtitle: "Nigerian Content Development Fund compliance audit",
          metric: "100% Audit Score",
          status: "Verified",
          date: "Today, 10:15 WAT",
          tag: "NCDMB Pack",
          detail: "Payroll, local fabrication spend, and raw material procurement reconciled. Ready for NOGIC-JQS upload.",
        },
        {
          id: "OCTG-2026-8812",
          title: "12-inch API 5L X65 PSL2 Seamless Line Pipe",
          subtitle: "Heat #HT-9821 • Bay B-04 • QR Tagged",
          metric: "420 Joints (5,040m)",
          status: "Verified",
          date: "Today, 09:30 WAT",
          tag: "Pipe Yard",
          detail: "Mill Test Certificate (MTC) EN 10204 3.1 attached. Wall thickness and Charpy impact tests validated.",
        },
        {
          id: "NCEC-2026-044",
          title: "NCEC Crane & Test Spread Calibration Tracker",
          subtitle: "100T Mobile Crane + High Pressure Pump Spread",
          metric: "Valid through Sept 2027",
          status: "Verified",
          date: "Yesterday, 16:00 WAT",
          tag: "NCEC Cert",
          detail: "Equipment inspection and third-party calibration certificate accepted by NCDMB inspector.",
        },
        {
          id: "BID-2026-0012",
          title: "Shell Bonga Deepwater Subsea EPC Bid Pack",
          subtitle: "NUPRC permits, PENCOM, ITF, NSITF, CAC",
          metric: "Dossier Compiled",
          status: "Active",
          date: "Yesterday, 12:40 WAT",
          tag: "IOC Tender",
          detail: "Statutory documents compiled into tamper-evident export pack matching SPDC vendor qualification format.",
        },
      ]}
      sections={[
        {
          title: "Local Content & NCDMB Compliance",
          items: [
            "NCDMB Nigerian Content spend engine (payroll, local fabrication, materials)",
            "NCDF Compliance Certificate (NCFCC) readiness checker and renewal alerts",
            "NOGIC-JQS export pack for registration, tender submission, and M&E reporting",
            "NCEC equipment certificate expiry and calibration tracker for spreads and cranes",
          ],
        },
        {
          title: "Pipe Yard & OCTG Control",
          items: [
            "Material requisition and pipe yard inventory control",
            "Heat numbers, Mill Test Certificates (MTCs), and wall thickness matching",
            "Bay locations, stacking height safety, and weather protection logs",
            "QR tagging and mobile scanner integration for pipe yard audits",
          ],
        },
        {
          title: "Tender & Vendor Management",
          items: [
            "Bid dossier export: NUPRC permits, PENCOM, ITF, NSITF, CAC documents",
            "Vendor prequalification workflow for IOC tenders (Shell, Chevron, TotalEnergies)",
            "Milestone verification for subsea and onshore pipeline EPC contracts",
          ],
        },
      ]}
      quickActions={[
        { label: "NCFCC Checker", desc: "Run compliance audit on local spend" },
        { label: "Log Pipe Yard MTC", desc: "Attach Mill Test Certificate to heat number" },
        { label: "Export NOGIC-JQS", desc: "Generate NCDMB portal upload dossier" },
        { label: "OCTG Stock Audit", desc: "Scan bay joints and record inspection" },
        { label: "NCEC Equipment", desc: "Check crane or test spread cert validity" },
        { label: "Compile Bid Pack", desc: "Bundle statutory certificates for IOC tender" },
      ]}
    />
  );
}
