import { ModulePage } from "@/components/dashboard/ModulePage";

export default function SafePassPage() {
  return (
    <ModulePage
      color="#dc2626"
      name="SafePass"
      fullName="HSE, Permits & Rotations"
      desc="Offshore mobilization gate, digital Permit-to-Work with gas test interlocks, JSA records, hazard observation reporting, CAPA tracking, and 14/14 rotation scheduler."
      stats={[
        { label: "Active Permits", value: "14", sub: "Hot work & confined space" },
        { label: "Crew on Rotation", value: "86", sub: "14/14 & 28/28 offshore" },
        { label: "Lost Time Incidents", value: "0", sub: "1,240 days LTI-free" },
        { label: "BOSIET Expiry Alerts", value: "3", sub: "Offshore manifests blocked" },
      ]}
      initialRecords={[
        {
          id: "PTW-HW-2026-0413",
          title: "Hot Work Permit: Pipe Welding on Spool S-04",
          subtitle: "Lekki Tank Farm Manifold • Lead: Engr. T. Balogun",
          metric: "H₂S: 0 ppm • LEL: 0%",
          status: "Verified",
          date: "Today, 10:24 WAT",
          tag: "PTW Approved",
          detail: "Gas tests verified: H₂S: 0 ppm, LEL: 0%, O₂: 20.9%. Fire watch posted, spark arrestor curtains rigged.",
        },
        {
          id: "MOB-2026-0082",
          title: "Offshore Mobilization Manifest — Escravos Field",
          subtitle: "24 Crew members cleared for chopper transfer",
          metric: "24/24 Verified",
          status: "Verified",
          date: "Today, 08:00 WAT",
          tag: "Crew Gate",
          detail: "All BOSIET, HUET, OSP, and medical fitness certificates validated with >30 days validity remaining.",
        },
        {
          id: "PTW-CS-2026-0109",
          title: "Confined Space Entry: Tank TK-09 Apapa",
          subtitle: "Pre-entry gas test detected H₂S at 12 ppm",
          metric: "Interlock: BLOCKED",
          status: "Flagged",
          date: "Today, 07:15 WAT",
          tag: "Gas Test Fail",
          detail: "Automated interlock blocked permit issue. Tank ventilation fans turned on. Forced aeration in progress.",
        },
        {
          id: "CAPA-2026-0024",
          title: "Corrective Action: Sling Tag Missing on Rigging Spread",
          subtitle: "Action Owner: HSE Officer D. Okonkwo",
          metric: "Closure: In Progress",
          status: "Active",
          date: "Yesterday, 15:30 WAT",
          tag: "CAPA Tracking",
          detail: "Rigging gear quarantined until third-party NDT load-test certificate reinspected.",
        },
      ]}
      sections={[
        {
          title: "Offshore Mobilization Gate",
          items: [
            "BOSIET, HUET, OSP, STCW, and offshore medical fitness verification",
            "Automated interlock blocks manifest addition when credentials expire within 30 days",
            "Rotation scheduler (14/14, 28/28) with standby vs. active day-rate tracking",
            "Real-time personnel on board (POB) tracking for safety compliance",
          ],
        },
        {
          title: "Digital Permit-to-Work (PTW)",
          items: [
            "Hot work, confined space, working at heights, excavation permits",
            "Gas test entry (H2S, LEL, O2) with automated interlocks",
            "Permit issuance blocked until gas tests and safety checklists pass",
            "Multi-level approvals: Performing Authority, Area Authority, OIM",
          ],
        },
        {
          title: "Hazard Reporting & CAPA",
          items: [
            "Offline near-miss and hazard observation reporting with photos",
            "5x5 risk matrix evaluation and root-cause categorization",
            "CAPA tracking with automated escalation to management",
            "Export audit packs for client HSE audits (Shell, Chevron, NUPRC)",
          ],
        },
      ]}
      quickActions={[
        { label: "Issue PTW", desc: "Start a hot work or confined space permit" },
        { label: "Log Gas Test", desc: "Enter H2S, LEL, and O2 atmospheric readings" },
        { label: "Mobilize Crew", desc: "Check BOSIET/HUET credentials and build manifest" },
        { label: "Report Hazard", desc: "Log unsafe act, condition, or near-miss" },
        { label: "CAPA Tracker", desc: "Review open corrective action milestones" },
        { label: "POB Roster", desc: "View current personnel on board" },
      ]}
    />
  );
}
