"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell, fieldClass } from "@/components/landing/AuthShell";
import { Icon } from "@/components/landing/icons";
import { BlurText } from "@/components/landing/primitives";
import { ApiError, authApi } from "@/lib/api";

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2 text-[13px] transition ${ok ? "text-emerald-700" : "text-slate-400"}`}>
      <span className={`grid h-4 w-4 place-items-center rounded-full ${ok ? "bg-emerald-600 text-white" : "border border-slate-300"}`}>{ok && <Icon.Check size={10} />}</span>
      {children}
    </li>
  );
}

function SetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const invite = params.get("invite") === "1";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(token ? "" : "This link is missing its security token. Request a new one below.");

  const longEnough = password.length >= 8;
  const matches = password.length > 0 && password === confirm;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !longEnough || !matches) return;
    setError("");
    setSubmitting(true);
    try {
      await authApi.confirmPasswordReset({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't set your password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow={invite ? "Your workspace is ready" : "Account recovery"}
      title={
        invite ? (
          <>
            Welcome to <span className="text-emerald-600">Offshora.</span>
          </>
        ) : (
          <>
            Back on record in <span className="text-emerald-600">a minute.</span>
          </>
        )
      }
      sub={
        invite
          ? "Your team set up a workspace with the modules you agreed on the demo. Choose a password to sign in."
          : "Choose a new password. Every other reset link for your account stops working once you do."
      }
      topLink={{ prompt: invite ? "Already set up?" : "Remembered it?", label: "Sign in", href: "/login" }}
    >
      <div className="mx-auto my-auto w-full max-w-[420px] py-10">
        {done ? (
          <div>
            <span className="seal-pop grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
              <Icon.Check size={26} />
            </span>
            <h1 className="font-display mt-7 text-[2.6rem] leading-[1.02] text-[#0a0f14]">
              <BlurText>
                <>
                  You&apos;re <span className="text-emerald-600">all set.</span>
                </>
              </BlurText>
            </h1>
            <p className="mt-3 text-[15.5px] text-slate-600">{invite ? "Your password is saved and your email is verified." : "Your password has been changed."} Sign in to continue.</p>
            <Link href="/login" className="btn-ink group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium">
              Sign in <Icon.Arrow size={16} className="transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        ) : (
          <>
            <span className="font-label inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-[12px] text-emerald-700 ring-1 ring-emerald-100">
              <span className="h-1.5 w-1.5 rounded-[2px] bg-emerald-500" />
              {invite ? "Step 1 of 1" : "New password"}
            </span>
            <h1 className="font-display mt-5 text-[2.6rem] leading-[1.02] text-[#0a0f14] sm:text-[3rem]">
              <BlurText>
                {invite ? (
                  <>
                    Set your <span className="text-emerald-600">password.</span>
                  </>
                ) : (
                  <>
                    Choose a new <span className="text-emerald-600">password.</span>
                  </>
                )}
              </BlurText>
            </h1>

            <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700">
                  <Icon.Alert size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {error}{" "}
                    <Link href="/forgot-password" className="font-medium underline underline-offset-2">
                      Get a new link
                    </Link>
                  </span>
                </div>
              )}
              <div>
                <label htmlFor="new-password" className="mb-2 block text-[13.5px] font-medium text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${fieldClass} pr-16`}
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} className="font-label absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[11.5px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-[13.5px] font-medium text-slate-800">
                  Confirm password
                </label>
                <input id="confirm-password" type={show ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={fieldClass} />
              </div>
              <ul className="space-y-1.5" aria-live="polite">
                <Check ok={longEnough}>At least 8 characters</Check>
                <Check ok={matches}>Both passwords match</Check>
              </ul>
              <button
                type="submit"
                disabled={submitting || !token || !longEnough || !matches}
                className="btn-ink group flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? "Saving…" : invite ? "Set password" : "Change password"}
                {!submitting && <Icon.Arrow size={16} className="transition group-hover:translate-x-0.5" />}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-[14px] text-slate-400">Loading…</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}
