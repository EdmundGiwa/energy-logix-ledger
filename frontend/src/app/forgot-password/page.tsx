"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell, fieldClass } from "@/components/landing/AuthShell";
import { Icon } from "@/components/landing/icons";
import { BlurText } from "@/components/landing/primitives";
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't send the link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={
        <>
          Back on record in <span className="text-emerald-600">a minute.</span>
        </>
      }
      sub="We'll email you a one-time link to choose a new password. It works for 30 minutes."
      topLink={{ prompt: "Remembered it?", label: "Sign in", href: "/login" }}
    >
      <div className="mx-auto my-auto w-full max-w-[420px] py-10">
        {submitted ? (
          <div>
            <span className="seal-pop grid h-14 w-14 place-items-center rounded-2xl bg-[#0a0f14] text-emerald-300">
              <Icon.Message size={24} />
            </span>
            <h1 className="font-display mt-7 text-[2.6rem] leading-[1.02] text-[#0a0f14]">
              <BlurText>
                <>
                  Check your <span className="text-emerald-600">inbox.</span>
                </>
              </BlurText>
            </h1>
            <p className="mt-3 text-[15.5px] leading-relaxed text-slate-600">
              If <span className="font-medium text-[#0a0f14]">{email}</span> has an Offshora account, a reset link is on its way. Check spam or promotions if it hasn&apos;t arrived in a few minutes.
            </p>
            <Link href="/login" className="btn-ink group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium">
              Back to sign in <Icon.Arrow size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        ) : (
          <>
            <span className="font-label inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-[12px] text-emerald-700 ring-1 ring-emerald-100">
              <span className="h-1.5 w-1.5 rounded-[2px] bg-emerald-500" />
              Forgot password
            </span>
            <h1 className="font-display mt-5 text-[2.6rem] leading-[1.02] text-[#0a0f14] sm:text-[3rem]">
              <BlurText>
                <>
                  Reset your <span className="text-emerald-600">password.</span>
                </>
              </BlurText>
            </h1>
            <p className="mt-3 text-[15.5px] text-slate-600">Enter the work email you sign in with.</p>
            <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700">
                  <Icon.Alert size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="reset-email" className="mb-2 block text-[13.5px] font-medium text-slate-800">
                  Work email
                </label>
                <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className={fieldClass} />
              </div>
              <button type="submit" disabled={submitting} className="btn-ink group flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium disabled:opacity-60">
                {submitting ? "Sending…" : "Send reset link"}
                {!submitting && <Icon.Arrow size={16} className="transition group-hover:translate-x-0.5" />}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
