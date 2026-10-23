import { ModulePage } from "@/components/dashboard/ModulePage";

export default function EquipTrackPage() {
  return (
    <ModulePage
      color="#a16207"
      name="EquipTrack"
      fullName="Rental Equipment, CCUs & Lifting Gear"
      desc="Know where every rental tool, container and lifting set is, whether its certificate is valid, and how many chargeable days it has run up offshore. Stop paying for equipment nobody sent back."
      stats={[
        { label: "Assets Tracked", value: "2,640", sub: "Tools, CCUs, slings" },
        { label: "Offshore Now", value: "784", sub: "On 6 installations" },
        { label: "Certs Due", value: "38", sub: "Within 30 days" },
        { label: "Rental Exposure", value: "$61k", sub: "Idle equipment, 30 d" },
      ]}
      initialRecords={[
        {
          id: "EQP-2026-1420",
          title: "Rental: Wireline Pressure Control Equipment",
          subtitle: "On rig Okoro-2 since 02 Oct • Supplier: Delta Tools",
          metric: "19 chargeable days",
          status: "Active",
          date: "Today, 08:00 WAT",
          tag: "Rental",
          detail: "Day rate $1,250. Off-rent request raised; return scheduled on VOY-2026-0611 backload.",
        },
        {
          id: "LFT-2026-0388",
          title: "Lifting Set Recertification: 4-leg Sling LS-2231",
          subtitle: "Annual thorough examination",
          metric: "Expires in 6 days",
          status: "Flagged",
          date: "Today, 07:30 WAT",
          tag: "Lifting Gear",
          detail: "Linked to CCU OC-0142. OffshoreLink will block load-out after expiry. Inspection booked at Onne rigging loft.",
        },
        {
          id: "CCU-2026-0142",
          title: "CCU Inspection: 10 ft Offshore Container OC-0142",
          subtitle: "Periodic inspection aligned with DNV-ST-E271",
          metric: "Passed • Next due Apr 2027",
          status: "Verified",
          date: "Yesterday, 13:15 WAT",
          tag: "CCU",
          detail: "Visual and NDT inspection by competent person. Plate and certificate photos attached; QR tag updated.",
        },
        {
          id: "EQP-2026-1398",
          title: "Idle Asset: Mud Pump Spares Basket",
          subtitle: "On FPSO Bonga • No movement 34 days",
          metric: "$4,080 idle rental",
          status: "Pending",
          date: "11 Oct 2026, 09:00 WAT",
          tag: "Idle Alert",
          detail: "Asset unused for 34 days. Off-rent recommendation sent to the drilling superintendent.",
        },
      ]}
      sections={[
        {
          title: "Asset Register",
          items: [
            "One register for owned and rented tools, CCUs, tanks and lifting gear",
            "QR / RFID tag per asset with location history (base, vessel, installation)",
            "Owner, supplier, serial, test pressure and capacity fields",
          ],
        },
        {
          title: "Certification & Inspection",
          items: [
            "CCU periodic inspection intervals aligned with DNV-ST-E271 (2.7-1)",
            "Lifting gear thorough examination and load-test certificates",
            "Pressure equipment test certificates and calibration records",
            "Expired items are blocked from OffshoreLink manifests",
          ],
        },
        {
          title: "Rental Cost Control",
          items: [
            "On-rent / off-rent dates and chargeable day counter",
            "Idle equipment alerts with daily cost exposure",
            "Supplier invoice check against tracked rental days",
            "Cost allocation per well, rig and project into Billing",
          ],
        },
      ]}
      quickActions={[
        { label: "Register Asset", desc: "Add a tool, CCU or sling with a tag" },
        { label: "Scan Asset", desc: "Update location and view certificate" },
        { label: "Off-rent Request", desc: "Stop the rental clock" },
        { label: "Upload Certificate", desc: "Add inspection or load-test cert" },
        { label: "Idle Report", desc: "Find equipment nobody is using" },
        { label: "Invoice Check", desc: "Match supplier invoice to rental days" },
      ]}
    />
  );
}
