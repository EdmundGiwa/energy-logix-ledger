"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/landing/icons";

const roles = [
  "Managing Director",
  "General Manager",
  "Operations Manager",
  "Dispatcher",
  "Barge Master",
  "Technician",
  "HSE Manager",
  "Compliance Officer",
  "Driver",
  "Other",
];

const tiers = [
  { id: "micro", label: "Micro Haulage", desc: "Up to 10 trucks, 1 depot", price: "$3,600/yr" },
  { id: "starter", label: "Starter", desc: "Up to 35 crew, 2 vessels", price: "$9,500/yr" },
  { id: "growth", label: "Growth", desc: "Up to 120 crew, 6 vessels", price: "$22,500/yr" },
  { id: "enterprise", label: "Enterprise", desc: "Up to 400 crew, full suite", price: "$48,000/yr" },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTier, setSelectedTier] = useState("starter");

  return (
    <div className="min-h-screen flex">
      {/* ── Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#060d18] via-[#0b1f33] to-[#0f2742]">
        <div className="absolute inset-0 dots-bg opacity-[0.03]" />
        <div className="absolute top-[-80px] right-[-60px] w-[420px] h-[420px] rounded-full bg-emerald-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-40px] left-[-40px] w-[320px] h-[320px] rounded-full bg-sky-500/[0.04] blur-[90px]" />

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <span className="leading-none">
              <span className="block text-[15px] font-extrabold uppercase tracking-[0.08em] text-white">
                Petro<span className="text-emerald-400">Ledger</span>
              </span>
              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.32em] text-emerald-400/70">
                Energy OS
              </span>
            </span>
          </div>
        </div>

        <div className="relative z-10 px-10 pb-14 space-y-8">
          <div>
            <h2 className="text-[1.85rem] font-extrabold text-white leading-[1.15] tracking-[-0.02em]">
              Start your
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                60-day pilot.
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-[14.5px] leading-relaxed max-w-[340px]">
              $2,500 credited against your first-year subscription if you
              convert. Pick one module, measure one KPI, and see the difference.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { label: "No long-term commitment", desc: "60-day trial with full module access" },
              { label: "Dedicated onboarding", desc: "Setup, data migration, and training included" },
              { label: "Pilot credit on conversion", desc: "$2,500 applied to your first annual plan" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 transition hover:bg-white/[0.05]"
              >
                <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <p className="text-[13.5px] font-semibold text-white/90">{f.label}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-slate-600">
            © {new Date().getFullYear()} PetroLedger Energy OS
          </p>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="flex-1 flex items-start justify-center px-6 py-10 bg-white relative overflow-y-auto">
        <div className="absolute inset-0 grid-bg opacity-30" />

        <div className="relative w-full max-w-[440px] pb-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <LogoMark size={36} />
            <span className="leading-none">
              <span className="block text-[15px] font-extrabold uppercase tracking-[0.08em] text-slate-900">
                Petro<span className="text-emerald-600">Ledger</span>
              </span>
              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.32em] text-emerald-700">
                Energy OS
              </span>
            </span>
          </div>

          {/* Heading */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-sm bg-emerald-600" />
              Get started
            </span>
            <h1 className="mt-4 text-[1.65rem] font-extrabold tracking-[-0.03em] text-slate-900">
              Create your account
            </h1>
            <p className="mt-2 text-[14.5px] text-slate-500">
              Set up your organization on PetroLedger in minutes.
            </p>
          </div>

          {/* Form */}
          <form className="mt-7 space-y-5" onSubmit={(e) => e.preventDefault()}>
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-first" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  First name
                </label>
                <input
                  id="reg-first"
                  type="text"
                  placeholder="Emeka"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                />
              </div>
              <div>
                <label htmlFor="reg-last" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Last name
                </label>
                <input
                  id="reg-last"
                  type="text"
                  placeholder="Okafor"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Work email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
              />
            </div>

            <div>
              <label htmlFor="reg-company" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Company name
              </label>
              <input
                id="reg-company"
                type="text"
                placeholder="Edflo Energy Services"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
              />
            </div>

            <div>
              <label htmlFor="reg-role" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Your role
              </label>
              <select
                id="reg-role"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22%2394a3b8%22 viewBox=%220 0 16 16%22><path d=%22M4 6l4 4 4-4%22 stroke=%22%2394a3b8%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')] bg-no-repeat bg-[right_12px_center]"
              >
                <option value="">Select your role</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Tier selector */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">
                Preferred tier
              </label>
              <div className="grid grid-cols-2 gap-2">
                {tiers.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTier(t.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                      selectedTier === t.id
                        ? "border-emerald-400 bg-emerald-50/60 ring-[3px] ring-emerald-100"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className={`text-[13px] font-semibold ${selectedTier === t.id ? "text-emerald-800" : "text-slate-700"}`}>
                      {t.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
                    <p className={`text-[11px] font-bold mt-1 ${selectedTier === t.id ? "text-emerald-600" : "text-slate-400"}`}>
                      {t.price}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 h-[18px] w-[18px] rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
              />
              <span className="text-[13px] text-slate-500 leading-snug">
                I agree to the{" "}
                <a href="#" className="font-semibold text-emerald-600 hover:text-emerald-700">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="font-semibold text-emerald-600 hover:text-emerald-700">Privacy Policy</a>.
              </span>
            </label>

            <Link
              href="/dashboard"
              className="btn-green flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold"
            >
              Create account
            </Link>
          </form>

          <div className="mt-7 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[12px] text-slate-400 font-medium whitespace-nowrap">
              Already have an account?
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <Link
            href="/login"
            className="btn-ghost mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
