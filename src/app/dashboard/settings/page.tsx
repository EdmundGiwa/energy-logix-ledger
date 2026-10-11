"use client";

import { useState, type ReactNode } from "react";

const sections = [
  { id: "roles", label: "Roles & access" },
  { id: "devices", label: "Field devices" },
  { id: "alerts", label: "Alert rules" },
  { id: "integrations", label: "Integrations" },
  { id: "audit", label: "Audit log" },
];

const roles = [
  { role: "Managing Director", users: 2, scope: "All modules · read, approve, export" },
  { role: "General Manager", users: 3, scope: "Operations modules · approve" },
  { role: "Dispatcher", users: 6, scope: "HaulTrac, RefineryLink" },
  { role: "Barge master", users: 4, scope: "BunkerFlow · capture and sign" },
  { role: "Technician", users: 38, scope: "PipeIntegrity, TankWorks · capture" },
  { role: "Driver", users: 61, scope: "HaulTrac mobile · waybill and POD" },
  { role: "Compliance officer", users: 2, scope: "SafePass, Compliance Shield, EPC-Link" },
];

const devices = [
  { name: "Barge PB-04 tablet", user: "T. Nwosu", os: "Android 14 · Zebra ET45", online: true, sync: "2 min ago", queued: 0 },
  { name: "Driver phone · LSD 482 XY", user: "M. Oduya", os: "Android 13", online: false, sync: "1 h ago", queued: 12 },
  { name: "Platform A HSE tablet", user: "K. Ibrahim", os: "iPadOS 18", online: true, sync: "40 s ago", queued: 0 },
  { name: "Weighbridge PC · Lekki", user: "J. Afolabi", os: "Windows 11", online: true, sync: "5 min ago", queued: 0 },
];

const integrations = [
  { name: "Paystack · Flutterwave", status: "Connected", tone: "ok" },
  { name: "WhatsApp Business API", status: "Connected", tone: "ok" },
  { name: "SAP Business One", status: "Connector pack", tone: "info" },
  { name: "NOGIC-JQS (NCDMB)", status: "Export only", tone: "info" },
  { name: "Lagos e-Call-Up", status: "Awaiting API access", tone: "warn" },
  { name: "Dangote gantry", status: "Needs agreement", tone: "warn" },
] as const;

const audit = [
  { t: "11 Oct 10:42", who: "T. Nwosu", what: "Signed e-BDN BDN-2026-0419", sig: "3fa9c2e1" },
  { t: "11 Oct 10:24", who: "K. Ibrahim", what: "Blocked PTW-2026-0412 · LEL 12%", sig: "7c02e9b3" },
  { t: "11 Oct 09:58", who: "System", what: "Pig PG-17 passed KP-46 (late)", sig: "e45b1a90" },
  { t: "10 Oct 16:20", who: "A. Okafor", what: "Issued invoice INV-2026-0418 · rate ₦1,480/$", sig: "19fd7a62" },
  { t: "10 Oct 14:05", who: "C. Eze", what: "Uploaded NCDF remittance evidence", sig: "c6e0b7d4" },
];

const toneCls = { ok: "bg-emerald-50 text-emerald-700", info: "bg-sky-50 text-sky-700", warn: "bg-amber-50 text-amber-700" };

function Block({ id, title, sub, children }: { id: string; title: string; sub: string; children: ReactNode }) {
  return (
    <section id={id} className="rise scroll-mt-28 rounded-[28px] bg-white p-5 sm:p-6">
      <p className="text-[18px] font-semibold tracking-tight text-slate-900">{title}</p>
      <p className="mt-1 text-[13px] text-slate-500">{sub}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({ label, desc, initial }: { label: string; desc: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f6f7f9] p-4">
      <div>
        <p className="text-[14px] font-medium text-slate-900">{label}</p>
        <p className="text-[12.5px] text-slate-500">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[1200px]">
      <header className="px-1 pb-5 pt-3">
        <h1 className="text-[2rem] font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-[15px] text-slate-500">Edflo Energy · Enterprise tier · single-tenant workspace</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Settings sections" className="no-scrollbar flex gap-2 overflow-x-auto lg:sticky lg:top-28 lg:flex-col lg:self-start">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-[13.5px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900">
              {s.label}
            </a>
          ))}
        </nav>

        <div className="space-y-4">
          <Block id="roles" title="Roles & access" sub="Each person sees only what their role needs. Changes are written to the audit log.">
            <div className="overflow-hidden rounded-[22px] bg-[#f6f7f9]">
              {roles.map((r, i) => (
                <div key={r.role} className={`flex items-center justify-between gap-4 bg-white px-4 py-3.5 ${i ? "border-t border-slate-100" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-slate-900">{r.role}</p>
                    <p className="truncate text-[12.5px] text-slate-500">{r.scope}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-700">{r.users} users</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Toggle label="Require two-factor sign-in" desc="For MD, GM and compliance roles" initial />
              <Toggle label="Single sign-on (SAML)" desc="Use your corporate identity provider" initial={false} />
            </div>
          </Block>

          <Block id="devices" title="Field devices" sub="Offline-first apps keep a local SQLite cache and delta-sync when the link returns.">
            <div className="grid gap-2 md:grid-cols-2">
              {devices.map((d) => (
                <div key={d.name} className="rounded-2xl bg-[#f6f7f9] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[14px] font-medium text-slate-900">{d.name}</p>
                    <span className={`flex shrink-0 items-center gap-1.5 text-[12px] font-medium ${d.online ? "text-emerald-700" : "text-amber-700"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${d.online ? "bg-emerald-500" : "bg-amber-400"}`} />
                      {d.online ? "Online" : "Offline"}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-slate-500">
                    {d.user} · {d.os}
                  </p>
                  <p className="mt-2 text-[12px] text-slate-600">
                    Last sync {d.sync}
                    {d.queued > 0 && <span className="font-medium text-amber-700"> · {d.queued} records queued</span>}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Toggle label="Remote wipe on lost device" desc="Clears the local cache next time the device connects" initial />
            </div>
          </Block>

          <Block id="alerts" title="Alert rules" sub="Where exceptions go, and how early you hear about renewals.">
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle label="Variance over 0.5%" desc="Email and push to GM and dispatcher" initial />
              <Toggle label="Failed gas test" desc="Push and SMS to HSE manager" initial />
              <Toggle label="Certificate renewals" desc="90, 60, 30 and 7 days before expiry" initial />
              <Toggle label="WhatsApp crew-expiry bot" desc="Message crew directly about their tickets" initial={false} />
            </div>
          </Block>

          <Block id="integrations" title="Integrations" sub="Every connection shows its real status.">
            <div className="grid gap-2 sm:grid-cols-2">
              {integrations.map((it) => (
                <div key={it.name} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f6f7f9] px-4 py-3.5">
                  <p className="text-[14px] font-medium text-slate-900">{it.name}</p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${toneCls[it.tone]}`}>{it.status}</span>
                </div>
              ))}
            </div>
          </Block>

          <Block id="audit" title="Audit log" sub="Append-only. Every edit, sign-off and deletion is timestamped, attributed and signed.">
            <div className="overflow-x-auto rounded-[22px] bg-[#f6f7f9]">
              <table className="w-full min-w-[620px] text-left text-[13px]">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-4 py-3 font-normal">Time</th>
                    <th className="py-3 font-normal">User</th>
                    <th className="py-3 font-normal">Action</th>
                    <th className="py-3 pr-4 font-normal">Signature</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {audit.map((a) => (
                    <tr key={a.sig} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{a.t}</td>
                      <td className="py-3 text-slate-700">{a.who}</td>
                      <td className="py-3 text-slate-900">{a.what}</td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-sky-700">{a.sig}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        </div>
      </div>
    </div>
  );
}
