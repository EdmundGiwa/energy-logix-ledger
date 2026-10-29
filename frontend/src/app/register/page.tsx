"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMark, Wordmark } from "@/components/landing/icons";
import { ApiError, authApi } from "@/lib/api";

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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // OTP Verification state
  const [verificationStep, setVerificationStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const router = useRouter();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const emailVal = String(data.get("email") ?? "").trim();
    try {
      await authApi.register({
        first_name: String(data.get("first_name") ?? ""),
        last_name: String(data.get("last_name") ?? ""),
        email: emailVal,
        organization_name: String(data.get("organization_name") ?? ""),
        job_title: String(data.get("job_title") ?? ""),
        requested_plan: selectedTier,
        password: String(data.get("password") ?? ""),
        terms_accepted: data.get("terms_accepted") === "on",
      });
      setRegisteredEmail(emailVal);
      setVerificationStep(true);
      setResendCooldown(60);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyError("");
    setVerifying(true);
    try {
      await authApi.confirmEmailVerification({ code: otpCode, email: registeredEmail });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Invalid verification code. Please check and try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return;
    setVerifyError("");
    try {
      await authApi.requestEmailVerification({ email: registeredEmail });
      setResendCooldown(60);
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Unable to resend verification code.");
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
            © {new Date().getFullYear()} Ofshora
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
            <Wordmark />
          </div>

          {verificationStep ? (
            /* ── Step 2: Verification Code ── */
            <div className="space-y-6 pt-6">
              <div>
                <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-sm bg-emerald-600" />
                  Step 2 of 2
                </span>
                <h1 className="mt-4 text-[1.65rem] font-extrabold tracking-[-0.03em] text-slate-900">
                  Verify your email
                </h1>
                <p className="mt-2 text-[14.5px] text-slate-500">
                  We sent a 6-digit confirmation code to <strong className="text-slate-900">{registeredEmail}</strong>.
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                {verifyError && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                    {verifyError}
                  </div>
                )}

                <div>
                  <label htmlFor="otp-input" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-300 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Code expires in 15 minutes. Check spam or promotions if you don&apos;t see it.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={verifying || otpCode.length !== 6}
                  className="btn-green flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold disabled:opacity-50"
                >
                  {verifying ? "Verifying…" : "Verify & Continue →"}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 transition"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      router.replace("/dashboard");
                      router.refresh();
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    Verify later →
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ── Step 1: Registration Form ── */
            <>
              <div>
                <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-sm bg-emerald-600" />
                  Get started
                </span>
                <h1 className="mt-4 text-[1.65rem] font-extrabold tracking-[-0.03em] text-slate-900">
                  Create your account
                </h1>
                <p className="mt-2 text-[14.5px] text-slate-500">
                  Set up your organization on Ofshora in minutes.
                </p>
              </div>

              <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                    {error}
                  </div>
                )}
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-first" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                      First name
                    </label>
                    <input
                      id="reg-first"
                      name="first_name"
                      type="text"
                      required
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
                      name="last_name"
                      type="text"
                      required
                      placeholder="Okonkwo"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                    />
                  </div>
                </div>

                {/* Work Email */}
                <div>
                  <label htmlFor="reg-email" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Work email
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    placeholder="emeka@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                  />
                </div>

                {/* Organization name */}
                <div>
                  <label htmlFor="reg-org" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Organization name
                  </label>
                  <input
                    id="reg-org"
                    name="organization_name"
                    type="text"
                    required
                    placeholder="Delta Maritime Logistics Ltd"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                  />
                </div>

                {/* Role / Job Title */}
                <div>
                  <label htmlFor="reg-role" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Your role
                  </label>
                  <select
                    id="reg-role"
                    name="job_title"
                    defaultValue="Managing Director"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="reg-password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 8 characters"
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

                {/* Pilot Tier Selection */}
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-2">
                    Select your pilot tier
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {tiers.map((tier) => {
                      const selected = selectedTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setSelectedTier(tier.id)}
                          className={`text-left p-3 rounded-xl border transition-all duration-150 ${
                            selected
                              ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200/80 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-slate-900">{tier.label}</span>
                            <span className="text-[12px] font-semibold text-emerald-700">{tier.price}</span>
                          </div>
                          <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">{tier.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Terms agreement */}
                <div className="flex items-start gap-2.5">
                  <input
                    id="terms"
                    name="terms_accepted"
                    type="checkbox"
                    required
                    className="mt-1 h-[18px] w-[18px] rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <label htmlFor="terms" className="text-[13px] text-slate-600 leading-snug">
                    I agree to the{" "}
                    <Link href="#" className="font-semibold text-emerald-600 hover:text-emerald-700 underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="font-semibold text-emerald-600 hover:text-emerald-700 underline">
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-green flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[14px] font-semibold"
                >
                  {submitting ? "Creating your account…" : "Create your account →"}
                </button>

                {/* Sign in link */}
                <p className="text-center text-[13.5px] text-slate-500 pt-2">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-emerald-600 hover:text-emerald-700 transition"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
