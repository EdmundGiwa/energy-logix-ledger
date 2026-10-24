"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  RefineryAppointment,
  RefineryMeterTicket,
  RefineryQualityCert,
  RefinerySummary,
  RefineryTank,
  RefineryTankDip,
  RefineryTerminal,
  refineryLinkApi,
} from "@/lib/api";

type CreateMode = "appointment" | "tank" | "dip" | "ticket" | "quality_cert" | "terminal" | null;
type ActiveTab = "appointments" | "tanks" | "tickets" | "quality_certs";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

export function RefineryDashboard() {
  const [summary, setSummary] = useState<RefinerySummary | null>(null);
  const [terminals, setTerminals] = useState<RefineryTerminal[]>([]);
  const [tanks, setTanks] = useState<RefineryTank[]>([]);
  const [appointments, setAppointments] = useState<RefineryAppointment[]>([]);
  const [dips, setDips] = useState<RefineryTankDip[]>([]);
  const [tickets, setTickets] = useState<RefineryMeterTicket[]>([]);
  const [qualityCerts, setQualityCerts] = useState<RefineryQualityCert[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("appointments");
  const [mode, setMode] = useState<CreateMode>(null);
  const [saving, setSaving] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    try {
      const [sum, termList, tankList, apptList, dipList, ticketList, qcList] = await Promise.all([
        refineryLinkApi.summary(),
        refineryLinkApi.terminals(),
        refineryLinkApi.tanks(),
        refineryLinkApi.appointments(),
        refineryLinkApi.dips(),
        refineryLinkApi.tickets(),
        refineryLinkApi.qualityCerts(),
      ]);
      setSummary(sum);
      setTerminals(termList);
      setTanks(tankList.results);
      setAppointments(apptList.results);
      setDips(dipList.results);
      setTickets(ticketList.results);
      setQualityCerts(qcList.results);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("RefineryLink data could not be loaded.", 0));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(event.currentTarget);

    try {
      if (mode === "terminal") {
        await refineryLinkApi.createTerminal({
          code: field(data, "code"),
          name: field(data, "name"),
          location: field(data, "location"),
        });
      } else if (mode === "tank") {
        await refineryLinkApi.createTank({
          terminal_id: field(data, "terminal_id"),
          tank_number: field(data, "tank_number"),
          product_type: field(data, "product_type"),
          nominal_capacity_litres: field(data, "nominal_capacity_litres"),
          safe_fill_level_mm: parseInt(field(data, "safe_fill_level_mm") || "0", 10),
        });
      } else if (mode === "appointment") {
        await refineryLinkApi.createAppointment({
          terminal_id: field(data, "terminal_id"),
          truck_plate: field(data, "truck_plate"),
          driver_name: field(data, "driver_name"),
          driver_phone: field(data, "driver_phone"),
          driver_license: field(data, "driver_license"),
          product_type: field(data, "product_type"),
          nominated_volume_litres: field(data, "nominated_volume_litres"),
          holding_park_slot: field(data, "holding_park_slot"),
          rfid_tag: field(data, "rfid_tag"),
          e_callup_reference: field(data, "e_callup_reference"),
          scheduled_at: new Date(field(data, "scheduled_at")).toISOString(),
          notes: field(data, "notes"),
        });
      } else if (mode === "dip") {
        await refineryLinkApi.createDip({
          tank_id: field(data, "tank_id"),
          dip_type: field(data, "dip_type"),
          observed_level_mm: field(data, "observed_level_mm"),
          water_cut_mm: field(data, "water_cut_mm") || "0.00",
          temperature_c: field(data, "temperature_c"),
          observed_density_kg_m3: field(data, "observed_density_kg_m3"),
          gross_observed_volume_litres: field(data, "gross_observed_volume_litres"),
          net_standard_volume_litres: field(data, "net_standard_volume_litres"),
          operator_name: field(data, "operator_name"),
          notes: field(data, "notes"),
        });
      } else if (mode === "ticket") {
        await refineryLinkApi.createTicket({
          appointment_id: field(data, "appointment_id"),
          tank_id: field(data, "tank_id"),
          meter_id: field(data, "meter_id"),
          batch_start_reading: field(data, "batch_start_reading"),
          batch_end_reading: field(data, "batch_end_reading"),
          gross_volume_litres: field(data, "gross_volume_litres"),
          net_volume_litres: field(data, "net_volume_litres"),
          temperature_c: field(data, "temperature_c"),
          density_at_15c: field(data, "density_at_15c"),
        });
      } else if (mode === "quality_cert") {
        await refineryLinkApi.createQualityCert({
          product_type: field(data, "product_type"),
          batch_number: field(data, "batch_number"),
          density_at_15c: field(data, "density_at_15c"),
          flash_point_c: field(data, "flash_point_c") || null,
          ron: field(data, "ron") || null,
          sulphur_ppm: field(data, "sulphur_ppm"),
          laboratory_name: field(data, "laboratory_name"),
          authorized_chemist: field(data, "authorized_chemist"),
          notes: field(data, "notes"),
        });
      }
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Could not save RefineryLink record.", 0));
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(appt: RefineryAppointment, action: string) {
    setActionInProgress(appt.id);
    setError(null);
    try {
      await refineryLinkApi.transitionAppointment(appt.id, action, appt.version, `Action ${action} triggered from dashboard`);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(`Action '${action}' failed.`, 0));
    } finally {
      setActionInProgress(null);
    }
  }

  const kpis = [
    ["Throughput Dispatched", summary ? `${Number(summary.today_throughput_litres).toLocaleString()} L` : "—", "Today's net standard volume"],
    ["Holding Park Queue", summary?.holding_park_queue_count ?? "—", "Lekki / Depot staging corridor"],
    ["Called Up (Gantry)", summary?.called_up_queue_count ?? "—", "Cleared for gantry ingress"],
    ["Depot Reconciliation", summary ? `${summary.reconciled_tickets_count} Reconciled / ${summary.flagged_tickets_count} Flagged` : "—", "Continuous meter verification"],
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] font-semibold text-amber-600">RefineryLink</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">
            Gantry, Tank Farm & Depot Management
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Terminal offtake scheduling, holding-park queue manager, automated tank gauging, and flowmeter ticket reconciliation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!terminals.length && (
            <button
              onClick={() => setMode("terminal")}
              className="h-10 rounded-full bg-amber-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
            >
              + Add Terminal
            </button>
          )}
          <button
            onClick={() => setMode("appointment")}
            className="h-10 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            + Schedule Offtake
          </button>
          <button
            onClick={() => setMode("dip")}
            className="h-10 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            + Tank Dip
          </button>
          <button
            onClick={() => setMode("ticket")}
            className="h-10 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            + Meter Ticket
          </button>
          <button
            onClick={() => setMode("quality_cert")}
            className="h-10 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            + Quality Cert
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([title, val, sub]) => (
          <article key={title} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{val}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </article>
        ))}
      </section>

      {/* Error notification */}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="font-semibold text-rose-950">RefineryLink Error</p>
          <p className="mt-1 text-sm text-rose-800">{error.message}</p>
        </div>
      )}

      {/* Creation Modal / Panel */}
      {mode && (
        <CreatePanel
          mode={mode}
          terminals={terminals}
          tanks={tanks}
          appointments={appointments}
          saving={saving}
          onMode={setMode}
          onSubmit={submit}
        />
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("appointments")}
          className={`border-b-2 px-4 py-3 ${activeTab === "appointments" ? "border-amber-600 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Offtake & Holding Queue ({appointments.length})
        </button>
        <button
          onClick={() => setActiveTab("tanks")}
          className={`border-b-2 px-4 py-3 ${activeTab === "tanks" ? "border-amber-600 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Depot Tanks & Gauging ({tanks.length})
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`border-b-2 px-4 py-3 ${activeTab === "tickets" ? "border-amber-600 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Gantry Meter Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setActiveTab("quality_certs")}
          className={`border-b-2 px-4 py-3 ${activeTab === "quality_certs" ? "border-amber-600 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          Quality Certificates ({qualityCerts.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "appointments" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 font-semibold text-slate-800">
            Offtake Appointments & Holding Park Queue
          </div>
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No offtake appointments recorded yet. Click &quot;+ Schedule Offtake&quot; to book a truck arrival.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Truck Plate / Driver</th>
                    <th className="p-3">Terminal</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Nominated Vol</th>
                    <th className="p-3">Slot / RFID</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {appointments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{a.reference}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{a.truck_plate}</div>
                        <div className="text-[11px] text-slate-400">{a.driver_name}</div>
                      </td>
                      <td className="p-3">{a.terminal_code}</td>
                      <td className="p-3 uppercase font-medium">{a.product_type}</td>
                      <td className="p-3 font-medium">{Number(a.nominated_volume_litres).toLocaleString()} L</td>
                      <td className="p-3">
                        {a.holding_park_slot || a.rfid_tag ? (
                          <span>{a.holding_park_slot || a.rfid_tag}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          a.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                          a.status === "loading" ? "bg-blue-100 text-blue-800" :
                          a.status === "called_up" ? "bg-amber-100 text-amber-800" :
                          a.status === "checked_in" ? "bg-purple-100 text-purple-800" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {label(a.status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {a.allowed_actions.map((act) => (
                            <button
                              key={act}
                              disabled={actionInProgress === a.id}
                              onClick={() => handleAction(a, act)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {act === "check_in" ? "Check In" : act === "call_up" ? "Call Up" : act === "start_loading" ? "Load" : act === "complete" ? "Complete" : act}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "tanks" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tanks.map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                    {t.product_type}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{t.terminal_code}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">Tank {t.tank_number}</h3>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Nominal Capacity:</span>
                    <span className="font-semibold text-slate-900">{Number(t.nominal_capacity_litres).toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Safe Fill Level:</span>
                    <span className="font-semibold text-slate-900">{t.safe_fill_level_mm.toLocaleString()} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-semibold capitalize text-emerald-700">{t.current_status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4 font-semibold text-slate-800">
              Recent Tank Gauge Dips (ATG & Manual)
            </div>
            {dips.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No tank gauge dips recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Tank</th>
                      <th className="p-3">Dip Type</th>
                      <th className="p-3">Observed Level</th>
                      <th className="p-3">Water Cut</th>
                      <th className="p-3">Temp / Density</th>
                      <th className="p-3">NSV (L)</th>
                      <th className="p-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {dips.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{d.reference}</td>
                        <td className="p-3 font-medium">{d.tank_number}</td>
                        <td className="p-3 capitalize">{d.dip_type}</td>
                        <td className="p-3 font-mono">{d.observed_level_mm} mm</td>
                        <td className="p-3 font-mono">{d.water_cut_mm} mm</td>
                        <td className="p-3">{d.temperature_c}°C · {d.observed_density_kg_m3} kg/m³</td>
                        <td className="p-3 font-bold text-slate-900">{Number(d.net_standard_volume_litres).toLocaleString()} L</td>
                        <td className="p-3 text-slate-500">{d.operator_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tickets" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 font-semibold text-slate-800">
            Gantry Meter Tickets & Reconciliation Ledger
          </div>
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No meter tickets recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="p-3">Ticket #</th>
                    <th className="p-3">Truck / Appt</th>
                    <th className="p-3">Meter ID</th>
                    <th className="p-3">Gross Vol (L)</th>
                    <th className="p-3">Net Vol (L)</th>
                    <th className="p-3">Variance</th>
                    <th className="p-3">Reconciliation Status</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tickets.map((tk) => (
                    <tr key={tk.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{tk.ticket_number}</td>
                      <td className="p-3">
                        <span className="font-medium text-slate-900">{tk.truck_plate}</span>
                        <div className="text-[10px] text-slate-400">{tk.appointment_reference}</div>
                      </td>
                      <td className="p-3 font-mono">{tk.meter_id}</td>
                      <td className="p-3">{Number(tk.gross_volume_litres).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-slate-900">{Number(tk.net_volume_litres).toLocaleString()}</td>
                      <td className="p-3 font-mono">
                        <span className={Number(tk.variance_percent) > 0 ? "text-amber-600" : Number(tk.variance_percent) < 0 ? "text-rose-600" : "text-slate-600"}>
                          {Number(tk.variance_percent) > 0 ? `+${tk.variance_percent}` : tk.variance_percent}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          tk.status === "reconciled" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {label(tk.status)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{new Date(tk.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "quality_certs" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 font-semibold text-slate-800">
            Product Batch Quality Certificates
          </div>
          {qualityCerts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No quality certificates registered yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="p-3">Certificate #</th>
                    <th className="p-3">Product / Batch</th>
                    <th className="p-3">Density @ 15°C</th>
                    <th className="p-3">Flash Point / RON</th>
                    <th className="p-3">Sulphur (ppm)</th>
                    <th className="p-3">NMDPRA Compliance</th>
                    <th className="p-3">Testing Lab</th>
                    <th className="p-3">Chemist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {qualityCerts.map((qc) => (
                    <tr key={qc.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{qc.certificate_number}</td>
                      <td className="p-3">
                        <span className="font-bold uppercase text-amber-800">{qc.product_type}</span>
                        <div className="text-[11px] text-slate-400">Batch {qc.batch_number}</div>
                      </td>
                      <td className="p-3 font-mono">{qc.density_at_15c} kg/m³</td>
                      <td className="p-3 font-mono">
                        {qc.flash_point_c ? `${qc.flash_point_c}°C` : qc.ron ? `RON ${qc.ron}` : "—"}
                      </td>
                      <td className="p-3 font-mono font-semibold">{qc.sulphur_ppm} ppm</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          qc.is_compliant_nmdpra ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {qc.is_compliant_nmdpra ? "NMDPRA Compliant" : "Off-Spec"}
                        </span>
                      </td>
                      <td className="p-3">{qc.laboratory_name}</td>
                      <td className="p-3 text-slate-500">{qc.authorized_chemist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreatePanel({
  mode,
  terminals,
  tanks,
  appointments,
  saving,
  onMode,
  onSubmit,
}: {
  mode: Exclude<CreateMode, null>;
  terminals: RefineryTerminal[];
  tanks: RefineryTank[];
  appointments: RefineryAppointment[];
  saving: boolean;
  onMode: (value: CreateMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const modes: Exclude<CreateMode, null>[] = ["appointment", "tank", "dip", "ticket", "quality_cert", "terminal"];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">New Refinery Record</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{label(mode)}</h2>
          </div>
          <button onClick={() => onMode(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            Cancel
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMode(m)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                m === mode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label(m)}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
        {mode === "terminal" && (
          <>
            <Input name="code" label="Terminal Code (e.g. LEKKI-01)" required />
            <Input name="name" label="Terminal Name" required />
            <Input name="location" label="Location" required />
          </>
        )}

        {mode === "tank" && (
          <>
            <Select name="terminal_id" label="Terminal" items={terminals.map((t) => [t.id, `${t.code} · ${t.name}`])} />
            <Input name="tank_number" label="Tank Number (e.g. TK-01)" required />
            <Select
              name="product_type"
              label="Product Type"
              items={[
                ["pms", "PMS (Petrol)"],
                ["ago", "AGO (Diesel)"],
                ["dpk", "DPK (Kerosene)"],
                ["atk", "ATK (Aviation)"],
              ]}
            />
            <Input name="nominal_capacity_litres" label="Nominal Capacity (Litres)" type="number" step="1" required />
            <Input name="safe_fill_level_mm" label="Safe Fill Level (mm)" type="number" required />
          </>
        )}

        {mode === "appointment" && (
          <>
            <Select name="terminal_id" label="Terminal" items={terminals.map((t) => [t.id, `${t.code} · ${t.name}`])} />
            <Input name="truck_plate" label="Truck Plate (e.g. NG-LAG-4418)" required />
            <Input name="driver_name" label="Driver Full Name" required />
            <Input name="driver_phone" label="Driver Phone" />
            <Input name="driver_license" label="Driver License #" />
            <Select
              name="product_type"
              label="Product Type"
              items={[
                ["ago", "AGO (Diesel)"],
                ["pms", "PMS (Petrol)"],
                ["dpk", "DPK (Kerosene)"],
                ["atk", "ATK (Aviation)"],
              ]}
            />
            <Input name="nominated_volume_litres" label="Nominated Volume (L)" type="number" step="0.01" required />
            <Input name="holding_park_slot" label="Holding Park Slot (e.g. Bay B-19)" />
            <Input name="rfid_tag" label="RFID Tag #" />
            <Input name="e_callup_reference" label="e-Call-Up Ref (Optional)" />
            <Input name="scheduled_at" label="Scheduled Date & Time" type="datetime-local" required />
          </>
        )}

        {mode === "dip" && (
          <>
            <Select name="tank_id" label="Depot Tank" items={tanks.map((t) => [t.id, `${t.terminal_code} · ${t.tank_number} (${t.product_type.toUpperCase()})`])} />
            <Select name="dip_type" label="Dip Type" items={[["manual", "Manual Ullage Dip"], ["automated", "Automated Tank Gauge (ATG)"]]} />
            <Input name="observed_level_mm" label="Observed Level (mm)" type="number" step="0.01" required />
            <Input name="water_cut_mm" label="Water Cut (mm)" type="number" step="0.01" defaultValue="0.00" />
            <Input name="temperature_c" label="Temperature (°C)" type="number" step="0.1" required />
            <Input name="observed_density_kg_m3" label="Observed Density (kg/m³)" type="number" step="0.1" required />
            <Input name="gross_observed_volume_litres" label="Gross Volume GOV (L)" type="number" step="0.01" required />
            <Input name="net_standard_volume_litres" label="Net Standard Volume NSV (L)" type="number" step="0.01" required />
            <Input name="operator_name" label="Gauge Operator Name" required />
          </>
        )}

        {mode === "ticket" && (
          <>
            <Select name="appointment_id" label="Offtake Appointment" items={appointments.map((a) => [a.id, `${a.reference} · ${a.truck_plate} (${a.driver_name})`])} />
            <Select name="tank_id" label="Source Tank" items={tanks.map((t) => [t.id, `${t.terminal_code} · ${t.tank_number}`])} />
            <Input name="meter_id" label="Meter ID (e.g. BAY-04-ACCULOAD)" required />
            <Input name="batch_start_reading" label="Batch Start Reading" type="number" step="0.01" required />
            <Input name="batch_end_reading" label="Batch End Reading" type="number" step="0.01" required />
            <Input name="gross_volume_litres" label="Gross Volume (L)" type="number" step="0.01" required />
            <Input name="net_volume_litres" label="Net Standard Volume (L)" type="number" step="0.01" required />
            <Input name="temperature_c" label="Temperature (°C)" type="number" step="0.1" required />
            <Input name="density_at_15c" label="Density @ 15°C (kg/m³)" type="number" step="0.1" required />
          </>
        )}

        {mode === "quality_cert" && (
          <>
            <Select name="product_type" label="Product Type" items={[["ago", "AGO (Diesel)"], ["pms", "PMS (Petrol)"], ["dpk", "DPK (Kerosene)"], ["atk", "ATK (Aviation)"]]} />
            <Input name="batch_number" label="Batch Number" required />
            <Input name="density_at_15c" label="Density @ 15°C" type="number" step="0.01" required />
            <Input name="flash_point_c" label="Flash Point (°C)" type="number" step="0.1" />
            <Input name="ron" label="RON (for PMS)" type="number" step="0.1" />
            <Input name="sulphur_ppm" label="Sulphur (ppm)" type="number" step="0.1" required />
            <Input name="laboratory_name" label="Testing Laboratory" required />
            <Input name="authorized_chemist" label="Authorized Chemist" required />
          </>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-4 md:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : `Save ${label(mode)}`}
          </button>
        </div>
      </form>
    </section>
  );
}

function Input({
  label: inputLabel,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      <label htmlFor={name} className="font-semibold text-slate-700">
        {inputLabel} {required && <span className="text-rose-600">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-600 focus:outline-none"
      />
    </div>
  );
}

function Select({
  label: selectLabel,
  name,
  items,
  required = false,
}: {
  label: string;
  name: string;
  items: [string, string][];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      <label htmlFor={name} className="font-semibold text-slate-700">
        {selectLabel} {required && <span className="text-rose-600">*</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-amber-600 focus:outline-none"
      >
        {items.map(([val, text]) => (
          <option key={val} value={val}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
