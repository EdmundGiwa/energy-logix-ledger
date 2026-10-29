"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark, Wordmark } from "@/components/landing/icons";
import { ApiError, authApi } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(token ? "" : "Invalid reset link. No security token provided.");
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Missing reset token. Please request a new password reset link.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await authApi.confirmPasswordReset({ token, password });
      setSuccess(true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Unable to update password. The link may have expired."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 mb-10 lg:hidden">
        <LogoMark size={32} />
        <Wordmark />
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Set new password
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Create a strong password for your Ofshora account.
        </p>
      </div>

      {success ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                ✓
              </div>
              <h3 className="font-semibold text-slate-900">Password Updated</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your password has been securely reset. You can now sign in with your new credentials.
            </p>
          </div>

          <Link
            href="/login"
            className="btn-green flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold text-center"
          >
            Sign in to Ofshora →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div>
            <label htmlFor="confirm-password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !token}
            className="btn-green flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold disabled:opacity-50"
          >
            {submitting ? "Updating password…" : "Update Password"}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
            Credential security.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              Protected across every session.
            </span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Updating your password automatically invalidates open recovery tokens and audits the event.
          </p>
        </div>
      </div>

      {/* ── Form Panel with Suspense Boundary ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-white">
        <Suspense fallback={<div className="text-center py-12 text-slate-400">Loading recovery form…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

