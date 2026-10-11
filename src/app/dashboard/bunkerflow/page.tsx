import { ModulePage } from "@/components/dashboard/ModulePage";

export default function BunkerFlowPage() {
  return (
    <ModulePage
      color="#0284c7"
      name="BunkerFlow"
      fullName="Marine Fuel & Port Services"
      desc="Nomination intake, tank soundings with ASTM 54B/56 conversion, e-BDN with dual signatures, sample seal tracking, STS transfer ledger, and port husbandry — all in one flow."
      stats={[
        { label: "Delivered Today", value: "3,420 MT", sub: "+6.2% vs. plan" },
        { label: "Active Stems", value: "8", sub: "Across 3 anchorages" },
        { label: "e-BDNs Issued", value: "12", sub: "All dual-signed" },
        { label: "Avg. Variance", value: "0.18%", sub: "Below 0.5% threshold" },
      ]}
      initialRecords={[
        {
          id: "BDN-2026-0419",
          title: "MT Sea Venture — VLSFO 0.5% Stem",
          subtitle: "Apapa SPM Anchorage • Chief Eng. Sign-off",
          metric: "1,250.0 MT @ 15°C",
          status: "Verified",
          date: "Today, 10:42 WAT",
          tag: "e-BDN Dual Signed",
          detail: "ASTM 54B VCF 0.9874, Density 845.2 kg/m³ @ 31.8°C. Sulphur: 0.42% m/m (MARPOL Annex VI compliant).",
        },
        {
          id: "SND-2026-0811",
          title: "Barge Edflo Pioneer — Tank Sounding #3",
          subtitle: "Forward 4.2m / Aft 4.8m trim corrected",
          metric: "4,180 m³ GSV",
          status: "Verified",
          date: "Today, 08:15 WAT",
          tag: "Sounding Log",
          detail: "Trim and temperature corrections applied via ASTM Table 54B. No water cut detected.",
        },
        {
          id: "STS-2026-0092",
          title: "STS Transfer: MT Ocean Star to MT Edflo Alpha",
          subtitle: "Lagos Offshore Fairway Buoy",
          metric: "820 m³/hr Pump Rate",
          status: "Active",
          date: "Today, 06:30 WAT",
          tag: "STS Active",
          detail: "Mooring checklist passed, Yokohama fenders checked, vapour balancing line engaged.",
        },
        {
          id: "MAR-2026-0314",
          title: "MARPOL Seal Tag #NG-MP-8819",
          subtitle: "Sample retained for NIMASA & Port State Control",
          metric: "Seal Verified",
          status: "Verified",
          date: "Yesterday, 16:50 WAT",
          tag: "Sample Seal",
          detail: "Tamper-evident barcode registered. Stored in climate-controlled bunker sample locker.",
        },
      ]}
      sections={[
        {
          title: "Bunkering Operations",
          items: [
            "Nomination intake, stem confirmation, price quote and invoice",
            "Tank sounding with ASTM 54B / 56 conversion, trim and temperature correction",
            "Forward and aft soundings with VCF calculation",
            "Variance checking and shrinkage analysis per stem",
          ],
        },
        {
          title: "Documentation & Compliance",
          items: [
            "e-BDN with flashpoint, viscosity, sulphur, water content",
            "Dual signatures — Chief Engineer and supplier",
            "Sample seal tracking with MARPOL Annex VI linked records",
            "Export e-BDN in standard formats for international counterparties",
          ],
        },
        {
          title: "STS Transfers",
          items: [
            "Mooring checklist and fender check",
            "Vapour balancing and pump-rate monitoring",
            "Job Safety Analysis (JSA) records",
            "Full STS transfer ledger with timestamps",
          ],
        },
        {
          title: "Port Husbandry",
          items: [
            "Fresh water, lube oils, spares, provisions tracking",
            "Delivery receipts with photo evidence",
            "Supplier performance tracking",
            "Port operations coordination with NPA",
          ],
        },
      ]}
      quickActions={[
        { label: "New Nomination", desc: "Start a new bunker stem nomination" },
        { label: "Record Sounding", desc: "Log tank soundings with ASTM correction" },
        { label: "Issue e-BDN", desc: "Generate an electronic Bunker Delivery Note" },
        { label: "Log STS Transfer", desc: "Record a ship-to-ship transfer operation" },
        { label: "Track Sample Seal", desc: "Log a fuel sample seal for MARPOL" },
        { label: "Port Husbandry", desc: "Record fresh water or provisions delivery" },
      ]}
    />
  );
}
