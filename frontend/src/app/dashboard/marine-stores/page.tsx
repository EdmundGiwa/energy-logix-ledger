import { ModulePage } from "@/components/dashboard/ModulePage";

export default function MarineStoresPage() {
  return (
    <ModulePage
      color="#0e7490"
      name="MarineStores"
      fullName="Ship Spares, Provisions & Consumables"
      desc="Catalogue for ship spares, branded marine lubricants (Total, Shell, Mobil), bonded stores and provisions, medical supplies with expiry tracking, and refrigerant gas inventory."
      stats={[
        { label: "Catalogue Items", value: "4,200", sub: "Spares & consumables" },
        { label: "Lubricants in Stock", value: "32,000 L", sub: "Shell, Mobil, Total" },
        { label: "Refrigerant Cylinders", value: "84", sub: "R404A, R22, R134a" },
        { label: "Active Orders", value: "11", sub: "For offshore vessels" },
      ]}
      initialRecords={[
        {
          id: "LUB-2026-1102",
          title: "Shell Alexia 40 Cylinder Oil Supply",
          subtitle: "Vessel: MT Marine Pioneer • Lagos Anchorage",
          metric: "8,000 Litres (40 Drums)",
          status: "Verified",
          date: "Today, 09:55 WAT",
          tag: "Branded Lube",
          detail: "Sealed drums with batch analysis certificates from Shell lubricant terminal. Delivery note signed by Chief Engineer.",
        },
        {
          id: "REF-2026-0034",
          title: "Refrigerant Gas Cylinder Dispatch: R404A",
          subtitle: "Cylinder serials: CY-8812 through CY-8815",
          metric: "4 Cylinders (54 kg net)",
          status: "Verified",
          date: "Today, 08:40 WAT",
          tag: "Refrigerant",
          detail: "Recovery log and tare weight logged in accordance with MARPOL Annex VI ozone-depleting substance protocol.",
        },
        {
          id: "BND-2026-0118",
          title: "Bonded Stores & Catering Provisions",
          subtitle: "Deepwater Crew Vessel 'Edflo Guardian'",
          metric: "14-Day Supply Delivered",
          status: "Verified",
          date: "Yesterday, 17:30 WAT",
          tag: "Provisions",
          detail: "Customs declaration sealed. Medical supplies verified with minimum 18 months expiry remaining.",
        },
        {
          id: "SPR-2026-0419",
          title: "Wärtsilä Main Engine Fuel Injector Spares",
          subtitle: "Part #W9L46-INJ-04 • Urgent AOG Delivery",
          metric: "6 Sets Cleared",
          status: "Active",
          date: "Yesterday, 14:10 WAT",
          tag: "Ship Spares",
          detail: "Air freight clearance at MMA Lagos completed. Transported by escort vehicle to Onne port gantry.",
        },
      ]}
      sections={[
        {
          title: "Spares & Consumables Catalogue",
          items: [
            "Catalogue for ship spares, deck and engine stores, PPE, life-saving equipment",
            "Medical supplies with automated expiration tracking and replenishment",
            "Charts and nautical publications subscription tracking",
            "Delivery receipts with photo evidence and receiving officer signature",
          ],
        },
        {
          title: "Branded Marine Lubricants",
          items: [
            "Branded lubricant catalogue with grade and pack-size lookup (Total, Shell, Mobil, Castrol, Oryx)",
            "Drum serial number and seal tracking",
            "Viscosity and lab certificate attachment per delivery",
            "Fresh water delivery receipts and barge meter records",
          ],
        },
        {
          title: "Offshore Provisioning & Catering",
          items: [
            "Provision orders sized from live POB in CrewTransit (meals per head per day)",
            "Chilled, frozen and dry stores packed into CCUs and booked on OffshoreLink voyages",
            "Cold-chain temperature log from base to installation galley",
            "Camp services: laundry, cleaning and accommodation consumables",
          ],
        },
        {
          title: "Refrigerant Gas Ledger",
          items: [
            "Refrigerant gas inventory (R404, R22, R407, R134a, R407C, R410A)",
            "Cylinder tracking and environmental recovery logs",
            "MARPOL Annex VI compliance for ozone-depleting substances",
          ],
        },
      ]}
      quickActions={[
        { label: "New Lube Order", desc: "Select grade, pack size and arrange delivery" },
        { label: "Log Gas Cylinder", desc: "Track R404/R22 cylinder serial and weight" },
        { label: "Order Provisions", desc: "Requisition bonded stores and catering packs" },
        { label: "Ship Spares Requisition", desc: "Search IMPA catalogue and issue PO" },
        { label: "Medical Expiry Audit", desc: "Check onboard first aid kit expiration dates" },
        { label: "Delivery Receipt", desc: "Capture receiving signature on barge or deck" },
      ]}
    />
  );
}
