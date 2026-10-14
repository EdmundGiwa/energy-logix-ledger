"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";

export type WorkflowDialogAction = {
  key: string;
  title: string;
  description: string;
  reasonLabel: string;
  confirmLabel: string;
  destructive?: boolean;
};

export function WorkflowActionDialog({
  action,
  busy,
  onClose,
  onConfirm,
}: {
  action: WorkflowDialogAction | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [reason, setReason] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !action) return;
    if (!dialog.open) dialog.showModal();
    const focusTimer = window.setTimeout(() => reasonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      if (dialog.open) dialog.close();
    };
  }, [action]);

  if (!action) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim() || busy) return;
    await onConfirm(reason.trim());
    setReason("");
  }

  function close() {
    if (busy) return;
    setReason("");
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-[28px] border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={submit} className="p-6 sm:p-7">
        <div className={`mb-5 grid h-11 w-11 place-items-center rounded-2xl ${action.destructive ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`} aria-hidden="true">
          {action.destructive ? "!" : "→"}
        </div>
        <h2 id={titleId} className="text-xl font-bold tracking-tight text-slate-950">{action.title}</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>

        <label className="mt-5 block text-xs font-bold text-slate-700">
          {action.reasonLabel}
          <textarea
            ref={reasonRef}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            maxLength={500}
            placeholder="Enter a short operational reason…"
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </label>
        <p className="mt-1 text-right text-[11px] text-slate-400">{reason.length}/500</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} disabled={busy} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50">Go back</button>
          <button disabled={busy || !reason.trim()} className={`h-11 rounded-xl px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${action.destructive ? "bg-rose-700 hover:bg-rose-800 focus-visible:ring-rose-500" : "bg-[#0b1523] hover:bg-slate-800 focus-visible:ring-sky-500"}`}>
            {busy ? "Saving…" : action.confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
