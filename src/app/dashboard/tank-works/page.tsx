import { ModulePage } from "@/components/dashboard/ModulePage";

export default function TankWorksPage() {
  return (
    <ModulePage
      color="#ca8a04"
      name="TankWorks"
      fullName="Tank & Field Services"
      desc="Job costing for tank evacuation, chemical cleaning, abrasive blasting and recoating, confined-space entries linked to SafePass, sludge disposal manifests, and crew utilization."
      stats={[
        { label: "Active Tank Jobs", value: "3", sub: "Apapa & Port Harcourt" },
        { label: "Sludge Disposed", value: "1,240 bbls", sub: "NESREA certified" },
        { label: "Coating Inspected", value: "4,800 m²", sub: "DFT within tolerance" },
        { label: "Crew Utilization", value: "91%", sub: "Blasting & coating crews" },
      ]}
      initialRecords={[
        {
          id: "JBC-2026-0042",
          title: "Tank TK-06 Evacuation & Chemical Degreasing",
          subtitle: "Apapa Depot Terminal 1 • Client: Oando / OVH",
          metric: "420 bbls Evacuated",
          status: "Verified",
          date: "Today, 09:42 WAT",
          tag: "Tank Cleaning",
          detail: "Sludge vacuumed, steam cleaning cycle complete. Gas tests passed for personnel entry under SafePass permit.",
        },
        {
          id: "WST-2026-0019",
          title: "NESREA Hazardous Sludge Waste Manifest",
          subtitle: "Disposal Facility: Environmental Solutions PH",
          metric: "18 MT Sludge Disposed",
          status: "Verified",
          date: "Today, 08:20 WAT",
          tag: "Waste Manifest",
          detail: "Chain of custody manifest signed by transport driver and licensed waste treatment facility officer.",
        },
        {
          id: "DFT-2026-0081",
          title: "Internal Lining Recoating DFT Inspection",
          subtitle: "Epoxy Novolac lining on Tank TK-04 floor",
          metric: "420 µm Nominal (Passed)",
          status: "Verified",
          date: "Yesterday, 16:45 WAT",
          tag: "DFT Coating",
          detail: "Dry Film Thickness (DFT) checked across 60 points. ASTM D3359 cross-hatch adhesion test scored 5B.",
        },
        {
          id: "CREW-2026-0310",
          title: "Blasting Crew Hours & Compressor Log",
          subtitle: "Grit Blasting SA 2.5 on Shell Wall Plates",
          metric: "148 Man-Hours Logged",
          status: "Active",
          date: "Yesterday, 12:00 WAT",
          tag: "Job Costing",
          detail: "Abrasive copper slag consumption: 14 MT. Compressor diesel burn rate recorded in daily cost ledger.",
        },
      ]}
      sections={[
        {
          title: "Tank Evacuation & Cleaning",
          items: [
            "Job costing for tank evacuation, degassing, washing, and chemical cleaning",
            "Confined-space entry linked to SafePass digital permits",
            "Continuous atmospheric gas monitoring (H2S, LEL, CO, O2)",
            "Sludge and hazardous waste disposal manifests certified by NESREA and FMEnv",
          ],
        },
        {
          title: "Blasting & Recoating Inspections",
          items: [
            "Surface preparation assessment: visual standard (SA 2.5 / SA 3.0)",
            "Recoating inspection records: Dry Film Thickness (DFT) readings",
            "Adhesion tests, holiday detector checks, and ambient conditions log (dew point)",
            "Coating warranty certificates and QA/QC packs for terminal owners",
          ],
        },
        {
          title: "Field Crew & Equipment Utilization",
          items: [
            "Crew hours and overtime tracking linked to payroll day rates",
            "Equipment utilization (compressors, vacuum trucks, blast pots, airless sprayers)",
            "Consumables burn rate (grit, copper slag, thinners, PPE)",
          ],
        },
      ]}
      quickActions={[
        { label: "New Tank Job", desc: "Create evacuation or cleaning project" },
        { label: "Log Gas Monitoring", desc: "Record atmospheric check inside tank" },
        { label: "Waste Manifest", desc: "Generate NESREA certified sludge slip" },
        { label: "DFT Inspection", desc: "Enter coating thickness and adhesion data" },
        { label: "Crew Timesheet", desc: "Log blasting crew hours and equipment run-time" },
        { label: "Job Cost Summary", desc: "Review project margin and consumables burn" },
      ]}
    />
  );
}
