"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell, fieldClass } from "@/components/landing/AuthShell";
import { Icon } from "@/components/landing/icons";
import { BlurText, Corners } from "@/components/landing/primitives";
import { RecordPanel } from "@/components/landing/RecordPanel";
import { chapters } from "@/components/landing/story";
import { ApiError, authApi } from "@/lib/api";

const ROTATE_MS = 9000;

function LiveRecord() {
  const [index, setIndex] = useState(1);
  useEffect(() => {
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % chapters.length), ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [index]);
  return <RecordPanel key={chapters[index].key} chapter={chapters[index]} active />;
}

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
    <AuthShell
      eyebrow="Offshora Energy OS"
      title={
        <>
          Every litre, every line, <span className="text-emerald-600">on record.</span>
        </>
      }
      sub="Pick up where your crews left off. Records captured offline sync the moment you sign in."
      aside={<LiveRecord />}
      topLink={{ prompt: "New to Offshora?", label: "Book a demo", href: "/book-demo" }}
    >
      <div className="mx-auto my-auto w-full max-w-[420px] py-10">
        <span className="font-label inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1 text-[12px] text-emerald-700 ring-1 ring-emerald-100">
          <span className="h-1.5 w-1.5 rounded-[2px] bg-emerald-500" />
          Welcome back
        </span>
        <h1 className="font-display mt-5 text-[2.6rem] leading-[1.02] text-[#0a0f14] sm:text-[3rem]">
          <BlurText>
            <>
              Sign in to <span className="text-emerald-600">Offshora.</span>
            </>
          </BlurText>
        </h1>
        <p className="mt-3 text-[15.5px] text-slate-600">Use your work email and password.</p>

        <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700">
              <Icon.Alert size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="mb-2 block text-[13.5px] font-medium text-slate-800">
              Work email
            </label>
            <input id="login-email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" className={fieldClass} />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="login-password" className="text-[13.5px] font-medium text-slate-800">
                Password
              </label>
              <Link href="/forgot-password" className="text-[13px] text-slate-500 underline-offset-4 transition hover:text-emerald-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={`${fieldClass} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-pressed={showPassword}
                className="font-label absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-[11.5px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <label className="flex w-fit cursor-pointer select-none items-center gap-2.5">
            <input type="checkbox" name="remember_me" className="h-[18px] w-[18px] rounded-md accent-emerald-600" />
            <span className="text-[14px] text-slate-600">Keep me signed in on this device</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="btn-ink group flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
            {!submitting && <Icon.Arrow size={16} className="transition group-hover:translate-x-0.5" />}
          </button>
        </form>

        <div className="corners mt-10 flex items-center justify-between gap-4 px-5 py-4 text-slate-400">
          <Corners />
          <div>
            <p className="text-[14px] font-medium text-[#0a0f14]">New to Offshora?</p>
            <p className="text-[13px] text-slate-500">See it with your own modules in 45 minutes.</p>
          </div>
          <Link href="/book-demo" className="cta-block inline-flex shrink-0 text-[14px]">
            <span className="arrow">
              <Icon.ArrowUpRight size={16} />
            </span>
            <span className="text-[#0a0f14]">Book a demo</span>
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
