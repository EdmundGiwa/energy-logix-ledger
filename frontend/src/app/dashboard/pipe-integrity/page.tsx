import { PipeIntegrityDashboard } from "@/components/pipeintegrity/PipeIntegrityDashboard";

export default function PipeIntegrityPage() {
  return <PipeIntegrityDashboard />;
  /* return (
    <ModulePage
      color="#059669"
      name="PipeIntegrity"
      fullName="Pipeline Services & EPC Support"
      desc="Pigging run tracker, hydrotest engine with hold-period validation, NDT and corrosion registry, cathodic protection surveys, and asset integrity dashboard."
      stats={[
        { label: "Active Pig Runs", value: "2", sub: "1 scraper, 1 intelligent" },
        { label: "Hydrotests Passed", value: "6", sub: "This quarter" },
        { label: "CP Survey Points", value: "340", sub: "99.2% protected" },
        { label: "Integrity Score", value: "98.4%", sub: "No critical anomalies" },
      ]}
      initialRecords={[
        {
          id: "HT-2026-088",
          title: "Escravos Trunkline 18-inch Hydrotest",
          subtitle: "Hold Duration: 24h @ 142.4 bar • ASME B31.4",
          metric: "0.02 bar drop (Passed)",
          status: "Verified",
          date: "Today, 10:38 WAT",
          tag: "Hydrotest Pack",
          detail: "Pressure vs temperature normalization verified hold criteria. NUPRC and Chevron witnesses countersigned digital certificate.",
        },
        {
          id: "PIG-2026-019",
          title: "Intelligent MFL/UT Pigging Run PG-19",
          subtitle: "Launcher KP 0.0 to Receiver KP 48.2",
          metric: "1.82 m/s velocity",
          status: "Active",
          date: "Today, 08:30 WAT",
          tag: "In Transit",
          detail: "Tracking electromagnetic transmitters at KP 12 and KP 28. Receiver pig trap crew mobilized with crane spread.",
        },
        {
          id: "CP-2026-004",
          title: "CIPS / DCVG Survey Manifold Station B",
          subtitle: "Cathodic protection potential survey",
          metric: "-1,120 mV CSE",
          status: "Verified",
          date: "Yesterday, 14:15 WAT",
          tag: "CP Reading",
          detail: "Transformer-rectifier output stable. Zero coating holiday indications on buried section.",
        },
        {
          id: "NDT-2026-041",
          title: "Wall Thickness UT Scan on Elbow E-12",
          subtitle: "Nominal: 14.3mm • Measured: 13.9mm",
          metric: "97.2% Remaining Life",
          status: "Verified",
          date: "Yesterday, 11:00 WAT",
          tag: "UT Corrosion",
          detail: "No localized pitting observed. Corrosion rate estimated at 0.04 mm/yr, exceeding 25-year design criteria.",
        },
      ]}
      sections={[
        {
          title: "Pigging Operations",
          items: [
            "Pig run tracker (scraper, brush, gauging, intelligent MFL/UT)",
            "Launcher pressure, tracking, transit velocity, receiver arrival",
            "Debris volume and composition recovered logging",
            "Real-time tracking notifications to receiver crews",
          ],
        },
        {
          title: "Hydrotest Engine",
          items: [
            "Pressure vs. temperature curve normalization",
            "Hold-period validation with automated pressure-drop alerts",
            "Governing code confirmation: ASME B31.4 (liquid) or B31.8 (gas)",
            "Export to IOC audit formats (Shell, Chevron, NNPC/NPDC)",
          ],
        },
        {
          title: "NDT & Corrosion Registry",
          items: [
            "Weld IDs, radiography, magnetic particle, wall thickness",
            "Remaining-life calculation and corrosion trending",
            "Asset integrity dashboard with inspection due dates",
            "Valve leak detection and maintenance records",
          ],
        },
        {
          title: "Cathodic Protection & Surveillance",
          items: [
            "CIPS and DCVG survey logs with potential profiles",
            "Rectifier readings and sacrificial anode records",
            "Right-of-way surveillance log: encroachment, valve station checks",
            "Geotagged photos with offline GPS capture",
          ],
        },
      ]}
      quickActions={[
        { label: "Log Pig Run", desc: "Launch or track a pipeline pigging operation" },
        { label: "Start Hydrotest", desc: "Initiate pressure hold monitoring" },
        { label: "Record NDT Weld", desc: "Enter radiography or wall thickness data" },
        { label: "Log CP Survey", desc: "Record CIPS / DCVG survey readings" },
        { label: "ROW Observation", desc: "Report right-of-way surveillance finding" },
        { label: "Integrity Report", desc: "Generate IOC-ready asset integrity dossier" },
      ]}
    />
  ); */
}
