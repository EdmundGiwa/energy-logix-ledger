"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark, Wordmark } from "@/components/landing/icons";
import { ApiError, authApi } from "@/lib/api";
import { BRAND_FULL } from "@/lib/brand";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      await authApi.login({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        remember_me: data.get("remember_me") === "on",
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#060d18] via-[#0b1f33] to-[#0f2742]">
        {/* Background decoration */}
        <div className="absolute inset-0 dots-bg opacity-[0.03]" />
        <div className="absolute top-[-80px] right-[-60px] w-[420px] h-[420px] rounded-full bg-emerald-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-40px] left-[-40px] w-[320px] h-[320px] rounded-full bg-sky-500/[0.04] blur-[90px]" />

        {/* Top: Logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <Wordmark tone="dark" />
          </div>
        </div>

        {/* Bottom: Tagline + features */}
        <div className="relative z-10 px-10 pb-14 space-y-8">
          <div>
            <h2 className="text-[1.85rem] font-extrabold text-white leading-[1.15] tracking-[-0.02em]">
              Every litre, every line,
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                on record.
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-[14.5px] leading-relaxed max-w-[340px]">
              One operating system for Nigerian energy service contractors.
              Bunkering, pipeline integrity, depot reconciliation, and haulage
              — all offline-first and audit-ready.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              { label: "Offline-first sync", desc: "Works in zero-signal field conditions" },
              { label: "Immutable audit log", desc: "Every edit timestamped and attributed" },
              { label: "12 integrated modules", desc: "One platform, every workflow" },
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
            © {new Date().getFullYear()} {BRAND_FULL}
          </p>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white relative">
        {/* Subtle background grid */}
        <div className="absolute inset-0 grid-bg opacity-30" />

        <div className="relative w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <LogoMark size={36} />
            <Wordmark />
          </div>

          {/* Heading */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-sm bg-emerald-600" />
              Welcome back
            </span>
            <h1 className="mt-4 text-[1.75rem] font-extrabold tracking-[-0.03em] text-slate-900">
              Sign in to your account
            </h1>
            <p className="mt-2 text-[14.5px] text-slate-500">
              Enter your credentials to access the Offshora platform.
            </p>
          </div>

          {/* Form */}
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="remember_me"
                  className="h-[18px] w-[18px] rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                />
                <span className="text-[13px] text-slate-600">Remember me</span>
              </label>
              <a
                href="#"
                className="text-[13px] font-semibold text-emerald-600 hover:text-emerald-700 transition"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-green flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[12px] text-slate-400 font-medium whitespace-nowrap">
              New to Offshora?
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <Link
            href="/register"
            className="btn-ghost mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold"
          >
            Start a 60-day pilot
          </Link>
        </div>
      </div>
    </div>
  );
}
