"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SEGMENTS, type SegmentKey } from "@/lib/demo";
import { Corners } from "./primitives";

/** "What do you run?" picker that opens the Book-a-Demo flow with the segment pre-selected. */
export function SegmentForm({ id, className = "" }: { id: string; className?: string }) {
  const router = useRouter();
  const [segment, setSegment] = useState<SegmentKey | "">("");
  return (
    <form
      className={`corners mx-auto w-full max-w-[520px] p-3 text-slate-400 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(segment ? `/book-demo?segment=${segment}` : "/book-demo");
      }}
    >
      <Corners />
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-0">
        <label htmlFor={id} className="sr-only">
          What does your company run?
        </label>
        <select
          id={id}
          value={segment}
          onChange={(e) => setSegment(e.target.value as SegmentKey | "")}
          className="h-12 w-full min-w-0 cursor-pointer sm:flex-1 appearance-none rounded-xl border border-slate-200 bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%221.6%22><path d=%22M3 4.5l3 3 3-3%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat px-4 pr-9 text-[14.5px] text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-[3px] focus:ring-emerald-100 sm:rounded-r-none sm:border-r-0"
        >
          <option value="">What does your company run?</option>
          {(Object.keys(SEGMENTS) as SegmentKey[]).map((key) => (
            <option key={key} value={key}>
              {SEGMENTS[key].label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-ink h-12 shrink-0 rounded-xl px-5 text-[14.5px] font-medium sm:rounded-l-none">
          Book my demo
        </button>
      </div>
    </form>
  );
}
