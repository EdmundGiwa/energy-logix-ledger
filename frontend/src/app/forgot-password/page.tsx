"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/landing/icons";
import { ApiError, authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await authApi.requestPasswordReset({ email });
      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to process request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

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
            <Wordmark tone="dark" />
          </div>
        </div>

        <div className="relative z-10 px-10 pb-14 space-y-6">
          <h2 className="text-[1.85rem] font-extrabold text-white leading-[1.2] tracking-[-0.02em]">
            Security first.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              Access restored in minutes.
            </span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Reset requests send an encrypted, single-use link directly to your verified email.
          </p>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <LogoMark size={32} />
            <Wordmark />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your registered email address and we&apos;ll send you a secure link to reset your credentials.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <h3 className="font-semibold text-slate-900">Check your inbox</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  If an active account exists for <strong className="text-slate-900">{email}</strong>, we have dispatched a password reset link. The link expires in 30 minutes.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="btn-ghost rounded-xl px-4 py-3 text-sm font-semibold w-full"
                >
                  Try another email
                </button>
                <Link
                  href="/login"
                  className="text-center text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
                >
                  ← Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="reset-email" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-green flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold"
              >
                {submitting ? "Sending reset link…" : "Send reset link"}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 transition"
                >
                  Remembered your password? <span className="font-semibold text-emerald-600">Sign in</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

