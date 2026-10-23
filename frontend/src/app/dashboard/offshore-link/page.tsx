import { ModulePage } from "@/components/dashboard/ModulePage";

export default function OffshoreLinkPage() {
  return (
    <ModulePage
      color="#0f766e"
      name="OffshoreLink"
      fullName="Supply Base & Deck Cargo Logistics"
      desc="Plan PSV voyages from the supply base to rigs, FPSOs and platforms. Build deck cargo manifests, track every CCU and basket out and back, gate dangerous goods, and reconcile backload against what was shipped."
      stats={[
        { label: "Voyages This Week", value: "18", sub: "Onne & Lekki bases" },
        { label: "Deck Cargo Shipped", value: "1,940 t", sub: "Out-bound, 7 days" },
        { label: "CCUs Offshore", value: "312", sub: "41 overdue for backload" },
        { label: "Deck Utilisation", value: "84%", sub: "Avg. across PSV fleet" },
      ]}
      initialRecords={[
        {
          id: "VOY-2026-0611",
          title: "PSV Voyage: Onne → Bonga FPSO → Agbami",
          subtitle: "MV Atlantic Grace • Sailing 18:00 WAT • 2 drops",
          metric: "612 m² deck • 87% used",
          status: "Active",
          date: "Today, 11:05 WAT",
          tag: "Voyage Plan",
          detail: "Load plan approved by base supervisor. Stowage respects DG segregation and deck load limits. ETA Bonga 06:30 WAT tomorrow.",
        },
        {
          id: "MAN-2026-2290",
          title: "Deck Cargo Manifest: 46 Lifts",
          subtitle: "Drill pipe, 22 CCUs, 4 chemical tote tanks, 1 mud basket",
          metric: "46/46 tagged & weighed",
          status: "Verified",
          date: "Today, 09:40 WAT",
          tag: "Manifest",
          detail: "Every lift weighed on the quayside load cell and matched to its CCU certificate. Manifest e-signed by base and master.",
        },
        {
          id: "DG-2026-0147",
          title: "Dangerous Goods Declaration: Class 8 Corrosives",
          subtitle: "4 × IBC acid totes for well stimulation",
          metric: "Segregation conflict",
          status: "Flagged",
          date: "Today, 08:15 WAT",
          tag: "IMDG Gate",
          detail: "Stowage plan placed totes adjacent to Class 5.1 oxidisers. Load-out blocked until the plan is revised.",
        },
        {
          id: "BKL-2026-0388",
          title: "Backload Reconciliation: Agbami Drop",
          subtitle: "18 CCUs returned • 3 skips of waste • 2 empty totes",
          metric: "3 CCUs unaccounted",
          status: "Pending",
          date: "Yesterday, 19:20 WAT",
          tag: "Backload",
          detail: "3 CCUs shipped on VOY-0598 not returned. Rental day-rate clock still running. Offshore materials coordinator notified.",
        },
      ]}
      sections={[
        {
          title: "Voyage & Load Planning",
          items: [
            "Multi-drop voyage planner for rigs, FPSOs, platforms and wellhead jackets",
            "Deck space planner with square metres, deck load and stowage drawing",
            "Bulk tank allocation linked to RigSupply (fuel, water, mud, cement)",
            "Weather window and sailing hold tracking with master's go/no-go",
            "Shared vessel runs to split voyage cost between operators",
          ],
        },
        {
          title: "Deck Cargo & CCU Control",
          items: [
            "Lift-by-lift manifest with QR / RFID tag, gross weight and destination",
            "CCU register (containers, baskets, tanks) aligned with DNV-ST-E271 (2.7-1) inspection intervals",
            "Lifting set and shackle certificate check before every load-out",
            "Dangerous goods (IMDG) declaration with segregation checks that block load-out",
            "Quayside weighing with load-cell capture and photo evidence",
          ],
        },
        {
          title: "Backload & Base Yard",
          items: [
            "Backload manifest and reconciliation against out-bound shipments",
            "Overdue CCU alerts with rental day-rate exposure",
            "Supply base yard and laydown bay locations for staged cargo",
            "Warehouse issue and receipt against operator purchase orders",
            "Proof of delivery signed by the offshore materials coordinator",
          ],
        },
      ]}
      quickActions={[
        { label: "Plan Voyage", desc: "Build a multi-drop PSV voyage and deck plan" },
        { label: "New Manifest", desc: "Add lifts, weights and destinations" },
        { label: "Scan CCU", desc: "Check certificate and log location" },
        { label: "DG Declaration", desc: "Declare IMDG cargo and check segregation" },
        { label: "Log Backload", desc: "Receive returned CCUs, skips and totes" },
        { label: "Sailing Hold", desc: "Record weather or port hold with reason" },
      ]}
    />
  );
}
