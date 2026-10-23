import { ModulePage } from "@/components/dashboard/ModulePage";

export default function CrewTransitPage() {
  return (
    <ModulePage
      color="#be185d"
      name="CrewTransit"
      fullName="Helicopter, Crew Boat & POB Logistics"
      desc="Book offshore personnel on helicopter flights and crew boat transfers, check credentials against SafePass before a seat is confirmed, weigh passengers and baggage, and keep personnel-on-board counts accurate when plans change."
      stats={[
        { label: "Personnel Offshore", value: "412", sub: "Across 6 installations" },
        { label: "Flights Today", value: "9", sub: "Lagos & Port Harcourt heliports" },
        { label: "Crew Boat Runs", value: "14", sub: "Shallow water & swamp" },
        { label: "Bed Utilisation", value: "91%", sub: "POB vs. lifeboat capacity" },
      ]}
      initialRecords={[
        {
          id: "FLT-2026-1184",
          title: "Helicopter Manifest: PHC → Bonga FPSO",
          subtitle: "AW139 • 12 pax • Departs 07:30 WAT",
          metric: "12/12 cleared • 1,268 kg",
          status: "Verified",
          date: "Today, 06:45 WAT",
          tag: "Flight Manifest",
          detail: "Each passenger's BOSIET / HUET and medical checked against SafePass. Body and baggage weights captured at check-in. Manifest sent to the aviation operator.",
        },
        {
          id: "FLT-2026-1185",
          title: "Seat Blocked: HUET Expired",
          subtitle: "Technician A. Eze • Lagos → Platform A",
          metric: "Seat released",
          status: "Flagged",
          date: "Today, 06:20 WAT",
          tag: "Credential Gate",
          detail: "HUET expired 3 days ago. Seat released to standby list and supervisor notified. Refresher booked at the training centre.",
        },
        {
          id: "CBT-2026-0562",
          title: "Crew Boat Transfer: Escravos Jetty → Platform Delta-7",
          subtitle: "Fast crew boat MV Swift Runner • 24 pax",
          metric: "Transfer basket • Sea state 1.4 m",
          status: "Active",
          date: "Today, 09:10 WAT",
          tag: "Crew Boat",
          detail: "Personnel transfer by basket approved for sea state under 2.0 m. Security escort assigned through MarineGuard.",
        },
        {
          id: "POB-2026-0091",
          title: "POB Reconciliation: Platform A Crew Change",
          subtitle: "18 off, 17 on • 1 no-show",
          metric: "POB 94 / 100 beds",
          status: "Pending",
          date: "Yesterday, 16:00 WAT",
          tag: "POB",
          detail: "No-show recorded and bed released. Muster list and lifeboat allocation updated for the offshore installation manager.",
        },
      ]}
      sections={[
        {
          title: "Flight & Boat Booking",
          items: [
            "Helicopter manifests by flight with seat allocation and standby list",
            "Crew boat and walk-to-work transfer bookings with sea-state limits",
            "Passenger and baggage weight capture at check-in",
            "Weather cancellations and rebooking without manual re-entry",
            "Shared flights between operators to split charter cost",
          ],
        },
        {
          title: "Credential Gate (with SafePass)",
          items: [
            "BOSIET / FOET, HUET, medical and site induction checked before seat confirmation",
            "Automatic seat release when a credential has expired",
            "ID check at the heliport with QR boarding pass",
          ],
        },
        {
          title: "Personnel on Board",
          items: [
            "Live POB per installation from flight and boat movements",
            "Bed and lifeboat capacity limits with over-capacity alerts",
            "Muster list export for the offshore installation manager",
            "Travel, hotel and ground transport for rotating crew",
          ],
        },
      ]}
      quickActions={[
        { label: "Build Flight Manifest", desc: "Add passengers and weights to a flight" },
        { label: "Book Crew Boat", desc: "Schedule a transfer with sea-state check" },
        { label: "Check-in Passenger", desc: "Scan ID and verify credentials" },
        { label: "POB Snapshot", desc: "Current personnel per installation" },
        { label: "Weather Rebook", desc: "Move a cancelled flight's passengers" },
        { label: "Muster List", desc: "Export muster and lifeboat allocation" },
      ]}
    />
  );
}
