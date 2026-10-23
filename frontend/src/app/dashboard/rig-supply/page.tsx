import { ModulePage } from "@/components/dashboard/ModulePage";

export default function RigSupplyPage() {
  return (
    <ModulePage
      color="#1d4ed8"
      name="RigSupply"
      fullName="Offshore Fuel, Water & Bulk Supply"
      desc="Deliver diesel, drill water, potable water, liquid mud, brine and dry bulk (barite, bentonite, cement) from the supply base to offshore installations. Track rig tank levels and days of supply, and reconcile every hose transfer."
      stats={[
        { label: "MGO Delivered", value: "2,860 m³", sub: "Last 30 days" },
        { label: "Rigs on Watch", value: "7", sub: "Days-of-supply tracking" },
        { label: "Low Stock Alerts", value: "2", sub: "Below 3 days of supply" },
        { label: "Transfer Variance", value: "0.21%", sub: "Vessel vs. rig meter" },
      ]}
      initialRecords={[
        {
          id: "BLK-2026-0731",
          title: "Diesel (MGO) Transfer to Jack-up Rig Okoro-2",
          subtitle: "PSV Sea Venture • Hose transfer at 6 m³/min",
          metric: "420 m³ • Δ 0.18%",
          status: "Verified",
          date: "Today, 10:12 WAT",
          tag: "Fuel Transfer",
          detail: "Vessel flowmeter 420.0 m³ vs. rig sounding 419.2 m³. Sample sealed, density 845 kg/m³ at 15 °C. Signed by barge engineer and rig toolpusher.",
        },
        {
          id: "BLK-2026-0729",
          title: "Liquid Mud (OBM) Delivery: 1.45 SG",
          subtitle: "Drillship Deep Horizon West • Mud engineer witness",
          metric: "180 m³ delivered",
          status: "Active",
          date: "Today, 07:50 WAT",
          tag: "Drilling Fluid",
          detail: "Pumping in progress. Mud weight checked at the vessel manifold and on the rig pits. Tank cleaning certificate attached for the vessel's mud tanks.",
        },
        {
          id: "DOS-2026-0044",
          title: "Low Stock: Drill Water at Platform EA-3",
          subtitle: "Rig tank 210 m³ • burn 85 m³/day",
          metric: "2.5 days of supply",
          status: "Flagged",
          date: "Today, 06:00 WAT",
          tag: "Days of Supply",
          detail: "Below the 3-day threshold. Next scheduled PSV call is in 4 days. Suggested: add a drop to VOY-2026-0611.",
        },
        {
          id: "BLK-2026-0722",
          title: "Dry Bulk: Class G Cement & Barite",
          subtitle: "Pneumatic transfer to semi-sub Bonny Star",
          metric: "95 t cement • 60 t barite",
          status: "Pending",
          date: "Yesterday, 21:30 WAT",
          tag: "Dry Bulk",
          detail: "Awaiting rig-side tonnage confirmation from the cement unit operator before the delivery ticket is sealed.",
        },
      ]}
      sections={[
        {
          title: "Bulk Liquids & Fuel",
          items: [
            "Marine gas oil (MGO / AGO) delivery tickets for rigs, FPSOs and platforms",
            "Drill water, potable water and brine with source and lab certificates",
            "Liquid mud (OBM / WBM / SBM) delivery with mud weight witness",
            "Vessel meter vs. rig sounding reconciliation with variance alerts",
            "Sample seals and density at 15 °C on every fuel transfer",
          ],
        },
        {
          title: "Dry Bulk",
          items: [
            "Cement, barite and bentonite tonnage per tank and per transfer",
            "Pneumatic transfer logs with start / stop pressure",
            "Bulk tank cleanliness certificates before product changes",
          ],
        },
        {
          title: "Rig Inventory & Planning",
          items: [
            "Live rig tank levels from the daily rig report or manual dip",
            "Days-of-supply forecast per product with low-stock alerts",
            "Auto-suggest drops onto planned OffshoreLink voyages",
            "Consumption trends per well, rig and operator for invoicing",
          ],
        },
      ]}
      quickActions={[
        { label: "New Bulk Transfer", desc: "Start a fuel, water or mud delivery ticket" },
        { label: "Update Rig Levels", desc: "Enter tank dips or import the rig report" },
        { label: "Seal Sample", desc: "Log seal number and witness" },
        { label: "Days of Supply", desc: "View forecast for every installation" },
        { label: "Dry Bulk Ticket", desc: "Record cement or barite tonnage" },
        { label: "Variance Review", desc: "Investigate meter vs. sounding gaps" },
      ]}
    />
  );
}
