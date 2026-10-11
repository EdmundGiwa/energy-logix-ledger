import { Icon } from "./icons";
import { Reveal, SectionHeading, Spotlight } from "./primitives";

const pillars = [
  { icon: Icon.Lock, t: "End-to-end encryption", d: "Data is encrypted at rest (AES-256) and in transit (TLS 1.3), on the central cloud and device local cache." },
  { icon: Icon.Fingerprint, t: "Cryptographically signed", d: "Signed records carry non-repudiable digital signatures. Once committed, entries cannot be silently edited." },
  { icon: Icon.Database, t: "Append-only audit trail", d: "Every create, modification and sign-off is micro-timestamped and user-attributed. History is immutable." },
  { icon: Icon.Server, t: "In-country data residency", d: "Host in Nigeria, international hyperscale cloud regions, or hybrid. Enterprise tenants receive dedicated instances." },
  { icon: Icon.IdCard, t: "NDPA 2023 compliance", d: "Crew and driver biometric and identity records are governed by Data Protection Impact Assessments." },
  { icon: Icon.Key, t: "Single-tenant isolation", d: "Dedicated tenant isolation on your corporate domain with private database clusters and custom SSO connectors." },
];

export function Security() {
  return (
    <section id="security" className="relative scroll-mt-24 px-5 py-24 sm:px-8 md:py-28 bg-white border-t border-slate-100">
      <div className="mx-auto max-w-[1240px]">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] sm:p-10 lg:p-14">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionHeading
                eyebrow="Security & data protection"
                title={
                  <>
                    Evidence you can put before <span className="text-gradient">an IOC auditor.</span>
                  </>
                }
                sub="A signed bunker stem or hydrotest certificate holds legal standing only if records remain tamper-proof. PetroLedger guarantees that standard."
              />

              <Reveal delay={120} className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[13px] leading-relaxed text-slate-700">
                  <span className="font-bold text-slate-900">Defensible audit readiness.</span> The system interface is engineered to WCAG 2.1 AA and control-room telemetry is aligned with ISO 11064 standards for operator ergonomics.
                </p>
              </Reveal>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pillars.map((p, i) => {
                const I = p.icon;
                return (
                  <Reveal key={p.t} delay={(i % 2) * 90}>
                    <Spotlight className="group h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition duration-300 hover:border-slate-300 hover:shadow-md">
                      <span className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800">
                        <I size={19} />
                      </span>
                      <p className="mt-4 text-[15px] font-bold text-slate-900">{p.t}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{p.d}</p>
                    </Spotlight>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
