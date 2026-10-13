import { ModulePage } from "@/components/dashboard/ModulePage";

export default function HaulTracPage() {
  return (
    <ModulePage
      color="#7c3aed"
      name="HaulTrac"
      fullName="Bulk Road Haulage"
      desc="Digital weighbridge integration, encrypted e-Waybills with QR verification, compartment valve telematics, route deviation alerts, and proof of delivery."
      stats={[
        { label: "Active Trips", value: "48", sub: "On Nigerian corridors" },
        { label: "Avg. Turnaround", value: "3.8 hrs", sub: "Gantry to discharge" },
        { label: "Fleet Compliance", value: "96%", sub: "68 of 71 roadworthy" },
        { label: "Alerts (24h)", value: "2", sub: "1 deviation, 1 stop" },
      ]}
      initialRecords={[
        {
          id: "EWB-2026-9041",
          title: "e-Waybill: Truck NG-LAG-4418",
          subtitle: "Lekki Refinery to Ikeja Industrial Depot",
          metric: "45,000 L AGO",
          status: "Active",
          date: "Today, 10:31 WAT",
          tag: "e-Waybill QR",
          detail: "Tamper-evident QR code generated. Telematics indicates green speed status on Lekki-Epe expressway corridor.",
        },
        {
          id: "WBR-2026-1142",
          title: "Digital Weighbridge Tare & Gross Slip",
          subtitle: "Dangote Refinery Outbound Weighbridge #2",
          metric: "Gross: 48,120 kg • Tare: 14,190 kg",
          status: "Verified",
          date: "Today, 10:22 WAT",
          tag: "Weighbridge",
          detail: "Direct digital scale interface read. Net payload: 33,930 kg matches gantry volumetric ticket.",
        },
        {
          id: "POD-2026-0814",
          title: "Proof of Delivery: Ikeja Depot Tank TK-02",
          subtitle: "Buyer Receiver: Engr. F. Adeleke",
          metric: "Zero Loss Discharge",
          status: "Verified",
          date: "Today, 09:10 WAT",
          tag: "POD Signed",
          detail: "Ullage dip recorded: 142 mm, temperature: 30.5°C, water-paste test negative. Signed via mobile offline signature.",
        },
        {
          id: "DEV-2026-0031",
          title: "Route Deviation Alert: Truck NG-ABJ-0091",
          subtitle: "4.2 km corridor variance detected",
          metric: "Route Alert",
          status: "Flagged",
          date: "Today, 07:45 WAT",
          tag: "Telematics",
          detail: "Driver notified by dispatch desk. Delay due to road construction on Sagamu-Ore interchange.",
        },
      ]}
      sections={[
        {
          title: "Weighbridge & Dispatch",
          items: [
            "Weighbridge tare and gross capture via digital bridge API",
            "Encrypted, tamper-evident e-Waybill with QR dispatch data",
            "Compartment valve state and geofence monitoring via telematics",
            "Route deviation and unauthorized-stop alerts sent to dispatch console",
          ],
        },
        {
          title: "Delivery & Proof of Discharge",
          items: [
            "Customer discharge: ullage, temperature, water-paste test",
            "Buyer e-signature on mobile glass in offline conditions",
            "Fee and levy ledger (holding park charges, state tolls) with dispute audit",
            "Automated demurrage calculation when turnaround exceeds SLA",
          ],
        },
        {
          title: "Fleet Compliance",
          items: [
            "Vehicle roadworthiness, tanker calibration, and FRSC certification",
            "Driver licensing, medical fitness, and drug test tracking",
            "Pre-trip vehicle checklist with offline photos",
          ],
        },
      ]}
      quickActions={[
        { label: "Dispatch Truck", desc: "Generate e-Waybill and assign route" },
        { label: "Weighbridge Capture", desc: "Log tare or gross weight reading" },
        { label: "Log Discharge", desc: "Capture proof of delivery and buyer sign-off" },
        { label: "Fleet Health", desc: "Review roadworthiness & calibration papers" },
        { label: "Levy Ledger", desc: "Record toll or holding-park charges" },
        { label: "Alert Log", desc: "Investigate route or geofence deviation" },
      ]}
    />
  );
}
