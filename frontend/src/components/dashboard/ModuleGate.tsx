"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/landing/icons";
import { BlurText, Corners } from "@/components/landing/primitives";
import { ApiError } from "@/lib/api";
import { MODULES, type ModuleKey } from "@/lib/demo";
import { useEntitlements } from "./Entitlements";
import { navItemFor, type NavItem } from "./Sidebar";

/** Shows a "not in your plan" screen instead of a module page the organization lacks. */
export function ModuleGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { enabled } = useEntitlements();
  const item = navItemFor(pathname);
  if (item?.module && !enabled.has(item.module)) return <LockedModule item={item} />;
  return <>{children}</>;
}

function LockedModule({ item }: { item: NavItem }) {
  const { requested, canRequest, requestAccess } = useEntitlements();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const moduleKey = item.module as string;
  const info = MODULES[moduleKey as ModuleKey];
  const isRequested = requested.has(moduleKey);
  const ItemIcon = item.icon;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await requestAccess(moduleKey, message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't send your request. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-[720px] py-10 sm:py-16">
      <div className="corners bg-white px-6 py-10 text-slate-300 sm:px-12 sm:py-14">
        <Corners />
        <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-[#0a0f14] text-emerald-300">
          <ItemIcon size={24} />
          <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
            <Icon.Lock size={12} />
          </span>
        </span>
        <p className="font-label mt-8 text-[11.5px] uppercase text-slate-500">Not in your plan yet</p>
        <h1 className="font-display mt-2 text-[2.4rem] leading-[1.04] text-[#0a0f14] sm:text-[3rem]">
          <BlurText>
            <>
              Add <span className="text-emerald-600">{item.label}</span> to your workspace.
            </>
          </BlurText>
        </h1>
        {info && <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-slate-600">{info.hint}. Switch it on alongside your current modules, on the same audit trail.</p>}

        {isRequested ? (
          <div className="mt-9 flex items-start gap-3 rounded-xl bg-emerald-50 px-5 py-4 text-[14.5px] text-emerald-900">
            <Icon.Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <p>
              <span className="font-medium">Request sent.</span> The Offshora team will contact you about adding {item.label}. It appears in your sidebar as soon as it&apos;s switched on.
            </p>
          </div>
        ) : canRequest ? (
          <form onSubmit={submit} className="mt-9 space-y-3">
            <label htmlFor="module-request-note" className="block text-[14px] font-medium text-[#0a0f14]">
              Anything we should know? <span className="font-label text-[11px] font-normal text-slate-400">OPTIONAL</span>
            </label>
            <textarea
              id="module-request-note"
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. We start a 6-month haulage contract in January."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-[#0a0f14] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-[4px] focus:ring-emerald-100"
            />
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-4 py-2.5 text-[13.5px] text-rose-700">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="submit" disabled={sending} className="btn-ink group inline-flex h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-medium disabled:opacity-60">
                {sending ? "Sending…" : "Request access"}
                {!sending && <Icon.Arrow size={16} className="transition group-hover:translate-x-0.5" />}
              </button>
              <Link href="/dashboard" className="h-12 rounded-xl px-4 text-[14.5px] leading-[3rem] text-slate-600 hover:text-[#0a0f14]">
                Back to overview
              </Link>
            </div>
          </form>
        ) : (
          <p className="mt-9 rounded-xl bg-slate-50 px-5 py-4 text-[14.5px] text-slate-600">
            Ask an owner or administrator in your organization to request {item.label}.
          </p>
        )}
      </div>
    </div>
  );
}
