import { Icon } from "./icons";
import { Corners } from "./primitives";

const items = [
  { tag: "OFFLINE", title: "Works with zero signal", text: "Captures on the barge, the right-of-way and the depot, then syncs on reconnect.", icon: Icon.WifiOff },
  { tag: "AUDIT", title: "Every edit signed and timestamped", text: "Tamper-evident history your client and regulator can trust.", icon: Icon.Lock },
  { tag: "MONEY", title: "Naira and dollar ledgers", text: "Job costing to invoice in both currencies on the same record.", icon: Icon.Wallet },
  { tag: "ACCESS", title: "Roles for every hand on site", text: "Crew, supervisor, client and MD each see exactly what they should.", icon: Icon.Key },
  { tag: "EVIDENCE", title: "Compliance document vault", text: "Permits, certificates and NCDMB evidence with expiry alerts.", icon: Icon.FileText },
  { tag: "FIELD", title: "Rugged hardware ready", text: "Zebra and Honeywell handhelds, weighbridges and printers.", icon: Icon.Phone },
  { tag: "CLIENTS", title: "A portal for your operators", text: "IOCs pull signed deliverables themselves. No more status emails.", icon: Icon.Globe },
];

function Card({ item }: { item: (typeof items)[number] }) {
  const ItemIcon = item.icon;
  return (
    <div className="corners mx-3 w-[340px] shrink-0 border border-slate-200 bg-white p-6 text-slate-400 sm:w-[400px]">
      <Corners />
      <p className="font-label flex items-center gap-2 text-[11.5px] text-slate-500">
        <ItemIcon size={14} className="text-emerald-600" />
        {item.tag}
      </p>
      <p className="font-display mt-5 text-[1.75rem] leading-[1.1] text-[#0a0f14]">{item.title}</p>
      <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{item.text}</p>
    </div>
  );
}

/** Infinite, hover-pausable strip of platform capabilities. */
export function Capabilities() {
  return (
    <section className="py-16" aria-label="Platform capabilities">
      <div className="edge-fade overflow-hidden">
        <div className="marquee-track">
          {[...items, ...items].map((item, i) => (
            <div key={`${item.tag}-${i}`} aria-hidden={i >= items.length ? true : undefined}>
              <Card item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
