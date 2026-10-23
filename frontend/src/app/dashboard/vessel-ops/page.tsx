import { ModulePage } from "@/components/dashboard/ModulePage";

export default function VesselOpsPage() {
  return (
    <ModulePage
      color="#2563eb"
      name="VesselOps"
      fullName="OSV Charter, Fleet & Vessel Compliance"
      desc="Run the offshore support fleet: PSVs, AHTS, crew boats, tugs and utility vessels. Record on-hire and off-hire, daily vessel reports, fuel and water remaining on board, certificates, inspections and NIMASA cabotage status."
      stats={[
        { label: "Vessels On-hire", value: "11", sub: "Of 13 in the fleet" },
        { label: "Fleet Utilisation", value: "87%", sub: "Chargeable days, 30 d" },
        { label: "Off-hire Days", value: "6.5", sub: "Breakdown & dry-dock" },
        { label: "Certs Expiring", value: "4", sub: "Within 60 days" },
      ]}
      initialRecords={[
        {
          id: "DVR-2026-3310",
          title: "Daily Vessel Report: AHTS Niger Titan",
          subtitle: "Anchor handling at Usan field • DP2",
          metric: "Fuel ROB 286 m³ • Water 410 m³",
          status: "Verified",
          date: "Today, 06:00 WAT",
          tag: "Daily Report",
          detail: "Activity log split into steaming, standby, DP operations and alongside. Fuel consumption 18.4 m³ over 24 h. Signed by master and charterer's rep.",
        },
        {
          id: "HIR-2026-0077",
          title: "Off-hire: PSV Delta Star Main Engine Fault",
          subtitle: "Charter party clause 14 • Breakdown",
          metric: "Off-hire from 02:40 WAT",
          status: "Flagged",
          date: "Today, 02:40 WAT",
          tag: "Off-hire",
          detail: "Off-hire time-stamped and acknowledged by the charterer. Day-rate stopped. Repair ETA 36 h. Replacement vessel requested.",
        },
        {
          id: "CAB-2026-0019",
          title: "NIMASA Cabotage Registration Renewal",
          subtitle: "Crew boat MV Swift Runner",
          metric: "Expires in 41 days",
          status: "Pending",
          date: "Yesterday, 14:30 WAT",
          tag: "Cabotage",
          detail: "Renewal pack 80% complete: ownership, crewing and flag documents uploaded. Linked to Compliance Shield calendar.",
        },
        {
          id: "INS-2026-0052",
          title: "OVID Inspection Close-out: PSV Atlantic Grace",
          subtitle: "7 observations • 5 closed",
          metric: "2 open observations",
          status: "Active",
          date: "11 Oct 2026, 10:00 WAT",
          tag: "Vessel Inspection",
          detail: "Open items: rescue boat davit maintenance record and garbage record book entry. Evidence due before next charter audit.",
        },
      ]}
      sections={[
        {
          title: "Charter & Hire",
          items: [
            "Charter party register with day rates, mob / demob fees and fuel terms",
            "On-hire and off-hire ledger time-stamped and signed by both parties",
            "Off-hire claims with evidence (breakdown, weather, dry-dock)",
            "Charter invoices raised from chargeable days into Billing",
          ],
        },
        {
          title: "Daily Operations",
          items: [
            "Daily vessel report: activities, position, DP hours, standby time",
            "Fuel, water and lube remaining on board with consumption trend",
            "Planned maintenance and defect log per vessel",
            "Voyage and fuel data for MARPOL Annex VI and IMO DCS reporting where it applies",
          ],
        },
        {
          title: "Vessel Compliance",
          items: [
            "Class, flag, ISM / ISPS, safety equipment and P&I certificates with expiry alerts",
            "NIMASA cabotage registration and waiver tracking",
            "OVID / CMID inspection findings tracked to close-out",
            "Crew certificates (STCW) and minimum safe manning check",
          ],
        },
      ]}
      quickActions={[
        { label: "Daily Vessel Report", desc: "Log activities, ROB and position" },
        { label: "Declare Off-hire", desc: "Time-stamp an off-hire event" },
        { label: "Charter Party", desc: "Add day rates and hire terms" },
        { label: "Upload Certificate", desc: "Add class, flag or ISM certificate" },
        { label: "Inspection Findings", desc: "Track OVID / CMID observations" },
        { label: "Defect Report", desc: "Log a machinery or safety defect" },
      ]}
    />
  );
}
