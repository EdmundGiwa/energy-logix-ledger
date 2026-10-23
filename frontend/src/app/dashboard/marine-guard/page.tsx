import { ModulePage } from "@/components/dashboard/ModulePage";

export default function MarineGuardPage() {
  return (
    <ModulePage
      color="#9f1239"
      name="MarineGuard"
      fullName="Maritime Security & Voyage Risk"
      desc="Plan safe transits in the Gulf of Guinea. Run voyage risk assessments, book security escort vessels, keep MDAT-GoG reporting on time, follow BMP West Africa checklists and log every security incident with evidence."
      stats={[
        { label: "Escorted Transits", value: "26", sub: "Last 30 days" },
        { label: "MDAT-GoG Reports", value: "100%", sub: "Filed on time" },
        { label: "High-risk Routes", value: "3", sub: "Escort mandatory" },
        { label: "Open Incidents", value: "1", sub: "Suspicious approach" },
      ]}
      initialRecords={[
        {
          id: "VRA-2026-0208",
          title: "Voyage Risk Assessment: Onne → Bonny Offshore Terminal",
          subtitle: "PSV Sea Venture • Night transit",
          metric: "Risk: High • Escort required",
          status: "Verified",
          date: "Today, 10:30 WAT",
          tag: "Risk Assessment",
          detail: "Route through a recent incident area. Escort booked, citadel drill done within 7 days, BMP West Africa checklist complete. Approved by company security officer.",
        },
        {
          id: "ESC-2026-0415",
          title: "Security Escort Booking",
          subtitle: "Escort for MV Atlantic Grace convoy",
          metric: "Rendezvous 17:30 WAT",
          status: "Active",
          date: "Today, 09:00 WAT",
          tag: "Escort",
          detail: "Escort provider, rendezvous point and comms plan logged. Escort cost allocated to VOY-2026-0611.",
        },
        {
          id: "MDT-2026-0773",
          title: "MDAT-GoG Position Report",
          subtitle: "Daily noon report • 4 vessels in the reporting area",
          metric: "4/4 sent",
          status: "Verified",
          date: "Today, 12:00 WAT",
          tag: "MDAT-GoG",
          detail: "Initial, daily and final reports tracked per voyage. AIS status logged with reason for any change.",
        },
        {
          id: "SEC-2026-0031",
          title: "Incident: Suspicious Skiff Approach",
          subtitle: "Crew boat MV Swift Runner • 12 nm south of Brass",
          metric: "No boarding • Evaded",
          status: "Flagged",
          date: "Yesterday, 22:45 WAT",
          tag: "Incident",
          detail: "Master's statement, time line and bridge photos captured offline. Report sent to MDAT-GoG and company security officer. Follow-up review open.",
        },
      ]}
      sections={[
        {
          title: "Voyage Risk & Planning",
          items: [
            "Voyage risk assessment per route, vessel and time of day",
            "Incident heat-map layers for routes and anchorages",
            "BMP West Africa ship-protection checklist before departure",
            "Citadel and security drill records per vessel",
          ],
        },
        {
          title: "Escorts & Reporting",
          items: [
            "Security escort booking with rendezvous, comms plan and cost",
            "MDAT-GoG initial, daily and final report tracker",
            "AIS status log with reasons, as Nigerian enforcement expects",
            "Ship security plan (ISPS) and security officer records",
          ],
        },
        {
          title: "Incidents & Evidence",
          items: [
            "Offline incident capture: statements, photos, positions and time line",
            "Notification chain to company, client and authorities",
            "Lessons-learned and corrective actions linked to SafePass CAPA",
          ],
        },
      ]}
      quickActions={[
        { label: "New Risk Assessment", desc: "Score a route before sailing" },
        { label: "Book Escort", desc: "Request an escort for a transit" },
        { label: "MDAT-GoG Report", desc: "Send initial, daily or final report" },
        { label: "BMP Checklist", desc: "Complete ship-protection measures" },
        { label: "Report Incident", desc: "Capture a security event offline" },
        { label: "Drill Record", desc: "Log a citadel or security drill" },
      ]}
    />
  );
}
