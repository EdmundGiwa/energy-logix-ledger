"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/landing/icons";
import { Corners } from "@/components/landing/primitives";
import { TEAM_TIMEZONE, dayKey, formatLongDate, formatTime, zoneAbbrev } from "@/lib/demo";

type Props = {
  /** ISO instants (UTC) that can be booked. */
  slots: string[];
  /** Zone the prospect reads times in. */
  timeZone: string;
  value: string | null;
  onChange: (iso: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Calendar-date arithmetic on "YYYY-MM-DD" keys, done in UTC so the host zone never shifts a day. */
const toDate = (key: string) => new Date(`${key}T00:00:00Z`);
const toKey = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (key: string) => key.slice(0, 7);

function monthGrid(month: string): (string | null)[] {
  const first = toDate(`${month}-01`);
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = new Date(first); monthKey(toKey(d)) === month; d.setUTCDate(d.getUTCDate() + 1)) cells.push(toKey(d));
  while (cells.length % 7) cells.push(null);
  return cells;
}

/**
 * Month calendar plus time list for picking one bookable slot.
 * Days without slots are disabled; times show in the prospect's zone, with the
 * team's zone alongside when they differ.
 */
export function SlotPicker({ slots, timeZone, value, onChange }: Props) {
  const byDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of slots) {
      const key = dayKey(iso, timeZone);
      map.set(key, [...(map.get(key) ?? []), iso]);
    }
    return map;
  }, [slots, timeZone]);

  const days = [...byDay.keys()].sort();
  const months = [...new Set(days.map(monthKey))];
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);

  const selectedDay =
    (value && byDay.has(dayKey(value, timeZone)) ? dayKey(value, timeZone) : null) ??
    (pickedDay && byDay.has(pickedDay) ? pickedDay : null) ??
    days[0] ??
    null;
  const month = (pickedMonth && months.includes(pickedMonth) ? pickedMonth : null) ?? (selectedDay ? monthKey(selectedDay) : months[0]);
  const monthIndex = months.indexOf(month);
  const showTeamZone = zoneAbbrev(slots[0] ?? new Date().toISOString(), timeZone) !== zoneAbbrev(slots[0] ?? new Date().toISOString(), TEAM_TIMEZONE);

  if (!days.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <p className="text-[15px] font-semibold text-slate-800">No open slots in the next three weeks</p>
        <p className="mt-1 text-[13px] text-slate-500">Email support@ofshora.com and we will find a time that works.</p>
      </div>
    );
  }

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(toDate(`${month}-01`));

  return (
    <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
      <div className="corners border border-slate-200 bg-white p-5 text-slate-400">
        <Corners />
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-[1.5rem] leading-none text-[#0a0f14]">{monthLabel}</p>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous month"
              disabled={monthIndex <= 0}
              onClick={() => setPickedMonth(months[monthIndex - 1])}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Icon.Chevron size={14} className="rotate-180" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={monthIndex >= months.length - 1}
              onClick={() => setPickedMonth(months[monthIndex + 1])}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Icon.Chevron size={14} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={monthLabel}>
          {WEEKDAYS.map((d) => (
            <span key={d} className="font-label pb-2 text-[10.5px] uppercase text-slate-400">
              {d}
            </span>
          ))}
          {monthGrid(month).map((key, i) => {
            if (!key) return <span key={`blank-${i}`} />;
            const open = byDay.has(key);
            const selected = key === selectedDay;
            return (
              <button
                key={key}
                type="button"
                disabled={!open}
                aria-pressed={selected}
                aria-label={`${new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(toDate(key))}${open ? `, ${byDay.get(key)!.length} times available` : ", unavailable"}`}
                onClick={() => setPickedDay(key)}
                className={`relative aspect-square rounded-lg text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  selected
                    ? "bg-[#0a0f14] text-white shadow-md shadow-slate-900/20"
                    : open
                      ? "bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                      : "text-slate-300"
                }`}
              >
                {Number(key.slice(8))}
                {open && !selected && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="corners border border-slate-200 bg-white p-5 text-slate-400">
        <Corners />
        <p className="font-display text-[1.5rem] leading-none text-[#0a0f14]">
          {selectedDay ? formatLongDate(byDay.get(selectedDay)![0], timeZone) : "Pick a day"}
        </p>
        <p className="font-label mt-2 text-[11px] text-slate-500">TIMES IN {zoneAbbrev(slots[0], timeZone)}</p>
        <div className="mt-3 grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-1">
          {(selectedDay ? byDay.get(selectedDay)! : []).map((iso) => {
            const active = iso === value;
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(iso)}
                className={`flex items-center justify-between rounded-lg border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 text-[#0a0f14] hover:border-emerald-400 hover:bg-emerald-50/40"
                }`}
              >
                <span className="font-label text-[15px]">{formatTime(iso, timeZone)}</span>
                {showTeamZone && (
                  <span className={`font-label text-[11px] ${active ? "text-emerald-100" : "text-slate-500"}`}>
                    {formatTime(iso, TEAM_TIMEZONE)} {zoneAbbrev(iso, TEAM_TIMEZONE)}
                  </span>
                )}
                {active && !showTeamZone && <Icon.Check size={16} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
