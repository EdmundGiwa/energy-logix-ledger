import { ModulePage } from "@/components/dashboard/ModulePage";

export default function RefineryLinkPage() {
  return (
    <ModulePage
      color="#d97706"
      name="RefineryLink"
      fullName="Gantry, Tank Farm & Depot"
      desc="Terminal offtake scheduling, Lagos State e-Call-Up queue integration, holding-park queue manager, automated tank gauging, and flowmeter ticket reconciliation."
      stats={[
        { label: "Throughput Value", value: "₦42.8M", sub: "Dispatched today" },
        { label: "Queue at Holding Park", value: "18", sub: "Lekki-Epe corridor" },
        { label: "Depots Reconciled", value: "42/42", sub: "Continuous recon" },
        { label: "Active Meters", value: "16", sub: "Smith & AccuLoad" },
      ]}
      initialRecords={[
        {
          id: "GTR-2026-8801",
          title: "Dangote Refinery Gantry Bay 04 Offtake",
          subtitle: "Truck NG-LAG-4418 • Driver: S. Aliu",
          metric: "45,000 L AGO",
          status: "Verified",
          date: "Today, 10:08 WAT",
          tag: "Meter Ticket",
          detail: "AccuLoad meter batch ticket reconciled. Density: 845.2 kg/m³, Flashpoint: 66°C, Sulphur: 9.8 ppm (Euro V).",
        },
        {
          id: "ECU-2026-1142",
          title: "Lagos e-Call-Up Holding Park #3 Slot",
          subtitle: "RFID tag #RF-8821 verified • Slot assigned",
          metric: "Slot #B-19 Assigned",
          status: "Active",
          date: "Today, 09:15 WAT",
          tag: "e-Call-Up",
          detail: "Driver accredited via mycallup.com API. Peak-hour restriction cleared for 10:00am gantry ingress.",
        },
        {
          id: "TK-2026-0014",
          title: "Depot Tank TK-14 Automated Gauge Dip",
          subtitle: "Observed level: 11,420 mm • Water cut: 0 mm",
          metric: "12,450,000 L NSV",
          status: "Verified",
          date: "Today, 06:00 WAT",
          tag: "ATG Recon",
          detail: "Continuous depot reconciliation: month-to-date shrinkage variance at 0.08%, well inside 0.5% tolerance.",
        },
        {
          id: "VAR-2026-0007",
          title: "Discharge Variance Audit — Depot BK-07",
          subtitle: "Investigating 0.72% variance on compartment C",
          metric: "0.72% Variance",
          status: "Flagged",
          date: "Yesterday, 18:20 WAT",
          tag: "Exception",
          detail: "Automated alert triggered. Telematics compartment valve logs requested from HaulTrac.",
        },
      ]}
      sections={[
        {
          title: "Gantry & Terminal Offtake",
          items: [
            "Terminal offtake and truck appointment scheduling",
            "Lagos State e-Call-Up connector (Lekki-Epe corridor, mycallup.com)",
            "Holding-park queue manager: check-in, RFID/QR read, slot assignment",
            "Driver accreditation and peak-hour restriction enforcement",
          ],
        },
        {
          title: "Depot Reconciliation & Gauging",
          items: [
            "Automated tank gauging (ATG) import and ullage dips",
            "GOV to NSV conversion at reference temperatures (15°C / 20°C)",
            "Gantry meter ticket reconciliation with AccuLoad and Smith Meter",
            "Continuous depot reconciliation replacing month-end scrambles",
          ],
        },
        {
          title: "Quality Certificates",
          items: [
            "Quality certificate linked to every batch (density, flash point, RON, sulphur)",
            "NMDPRA wholesale metering compliance verification",
            "Shrinkage and transit loss ledger with automated dispute packs",
            "Dual-currency throughput accounting (Naira & USD)",
          ],
        },
      ]}
      quickActions={[
        { label: "Schedule Truck", desc: "Book terminal offtake appointment" },
        { label: "Log Gantry Ticket", desc: "Reconcile meter batch ticket" },
        { label: "Tank Dip", desc: "Record automated or manual tank gauge" },
        { label: "e-Call-Up Queue", desc: "Manage holding park queue & RFID read" },
        { label: "Batch Quality Cert", desc: "Attach lab analysis to product batch" },
        { label: "Reconciliation Run", desc: "Execute depot balance ledger" },
      ]}
    />
  );
}
