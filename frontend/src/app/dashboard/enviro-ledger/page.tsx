import { ModulePage } from "@/components/dashboard/ModulePage";

export default function EnviroLedgerPage() {
  return (
    <ModulePage
      color="#16a34a"
      name="EnviroLedger"
      fullName="Offshore Waste, Discharges & Emissions"
      desc="Track offshore waste from the installation to licensed disposal, keep MARPOL record books in order, report oil spills, and calculate fuel-based emissions per vessel, voyage and client."
      stats={[
        { label: "Waste Backloaded", value: "148 t", sub: "Last 30 days" },
        { label: "Chain of Custody", value: "97%", sub: "Closed with disposal cert" },
        { label: "CO₂ from Fleet Fuel", value: "4,210 t", sub: "Year to date" },
        { label: "Spill Reports", value: "0", sub: "Open with regulator" },
      ]}
      initialRecords={[
        {
          id: "WTN-2026-0644",
          title: "Waste Transfer Note: Drill Cuttings",
          subtitle: "Platform EA-3 → Onne treatment yard • 12 skips",
          metric: "36.4 t • Licensed contractor",
          status: "Verified",
          date: "Today, 08:55 WAT",
          tag: "Waste Manifest",
          detail: "Skip numbers and weights matched to the OffshoreLink backload. Disposal certificate attached by the licensed waste contractor.",
        },
        {
          id: "GRB-2026-0218",
          title: "Garbage Record Book Entry",
          subtitle: "PSV Atlantic Grace • Category C & D",
          metric: "Landed ashore 1.2 m³",
          status: "Verified",
          date: "Yesterday, 15:20 WAT",
          tag: "MARPOL Annex V",
          detail: "Port reception receipt attached. Entry signed by the officer in charge and countersigned by the master.",
        },
        {
          id: "WTN-2026-0641",
          title: "Chain of Custody Gap: Oily Sludge",
          subtitle: "6 drums backloaded on VOY-2026-0598",
          metric: "No disposal certificate",
          status: "Flagged",
          date: "Yesterday, 11:00 WAT",
          tag: "Custody Gap",
          detail: "Drums received at base but no disposal certificate after 10 days. Escalated to the environmental adviser.",
        },
        {
          id: "EMS-2026-Q3",
          title: "Quarterly Emissions Summary: Q3 2026",
          subtitle: "13 vessels • fuel-based CO₂ by client",
          metric: "1,388 t CO₂",
          status: "Pending",
          date: "01 Oct 2026, 09:00 WAT",
          tag: "Emissions",
          detail: "Calculated from MGO consumption in daily vessel reports using IMO fuel emission factors. Awaiting review before client ESG submission.",
        },
      ]}
      sections={[
        {
          title: "Offshore Waste Chain of Custody",
          items: [
            "Waste transfer notes from installation to vessel to base to disposal",
            "Drill cuttings, oily waste, chemicals, scrap and general waste categories",
            "Skip and drum tracking linked to OffshoreLink backload",
            "Licensed disposal contractor certificates with custody-gap alerts",
          ],
        },
        {
          title: "Discharges & Record Books",
          items: [
            "MARPOL Annex I oil record book and Annex V garbage record book entries",
            "Produced water and bilge discharge logs with oil-in-water readings",
            "Oil spill reporting pack with location, volume and response actions for NOSDRA",
            "Spill drill and response equipment readiness records",
          ],
        },
        {
          title: "Emissions & ESG",
          items: [
            "Fuel-based CO₂ per vessel, voyage, installation and client",
            "Data ready for IMO DCS and CII where the vessel size requires it",
            "Flaring and venting volume log for operator reporting",
            "ESG summary export for IOC client and lender reports",
          ],
        },
      ]}
      quickActions={[
        { label: "New Waste Note", desc: "Start a waste transfer note" },
        { label: "Record Book Entry", desc: "Add an oil or garbage record" },
        { label: "Report Spill", desc: "Capture spill details offline" },
        { label: "Upload Disposal Cert", desc: "Close a waste chain of custody" },
        { label: "Emissions Report", desc: "Generate CO₂ by vessel or client" },
        { label: "Discharge Log", desc: "Record bilge or produced water discharge" },
      ]}
    />
  );
}
