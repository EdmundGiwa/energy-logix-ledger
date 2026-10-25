"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  InventoryMovement,
  MarineCatalogueItem,
  MarineStoresSummary,
  RefrigerantCylinder,
  StoreInventoryItem,
  StoreOrder,
  marineStoresApi,
} from "@/lib/api";

type CreateMode = "catalogue" | "intake" | "cylinder" | "order" | null;
type ActiveTab = "orders" | "inventory" | "catalogue" | "cylinders" | "movements";

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

export function MarineStoresDashboard() {
  const [summary, setSummary] = useState<MarineStoresSummary | null>(null);
  const [catalogue, setCatalogue] = useState<MarineCatalogueItem[]>([]);
  const [inventory, setInventory] = useState<StoreInventoryItem[]>([]);
  const [cylinders, setCylinders] = useState<RefrigerantCylinder[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("orders");
  const [mode, setMode] = useState<CreateMode>(null);
  const [saving, setSaving] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  // Delivery prompt state
  const [deliverOrder, setDeliverOrder] = useState<StoreOrder | null>(null);

  const load = useCallback(async () => {
    try {
      const [sum, catList, invList, cylList, orderList, movList] = await Promise.all([
        marineStoresApi.summary(),
        marineStoresApi.catalogue(),
        marineStoresApi.inventory(),
        marineStoresApi.cylinders(),
        marineStoresApi.orders(),
        marineStoresApi.movements(),
      ]);
      setSummary(sum);
      setCatalogue(catList);
      setInventory(invList);
      setCylinders(cylList);
      setOrders(orderList.results);
      setMovements(movList.results);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("MarineStores data could not be loaded.", 0));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleCreateCatalogue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await marineStoresApi.createCatalogueItem({
        item_code: field(data, "item_code"),
        name: field(data, "name"),
        category: field(data, "category"),
        unit_of_measure: field(data, "unit_of_measure") || "piece",
        brand: field(data, "brand"),
        impa_code: field(data, "impa_code"),
        minimum_stock_level: parseInt(field(data, "minimum_stock_level") || "0", 10),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to add catalogue item.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleRecordIntake = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await marineStoresApi.recordReceipt({
        item_id: field(data, "item_id"),
        location: field(data, "location"),
        quantity: field(data, "quantity"),
        unit_cost_minor: Math.round(parseFloat(field(data, "unit_cost") || "0") * 100),
        currency: field(data, "currency") || "NGN",
        batch_or_lot_number: field(data, "batch_or_lot_number"),
        serial_number: field(data, "serial_number"),
        expires_on: field(data, "expires_on") || null,
        reason: field(data, "reason") || "Stock intake",
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to record stock intake.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCylinder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      const tare = parseFloat(field(data, "tare_weight_kg") || "0");
      const gross = parseFloat(field(data, "gross_weight_kg") || "0");
      const net = (gross - tare).toFixed(2);
      await marineStoresApi.createCylinder({
        cylinder_serial: field(data, "cylinder_serial"),
        gas_type: field(data, "gas_type"),
        tare_weight_kg: field(data, "tare_weight_kg"),
        gross_weight_kg: field(data, "gross_weight_kg"),
        net_gas_weight_kg: net,
        status: field(data, "status") || "full",
        assigned_vessel_or_facility: field(data, "assigned_vessel_or_facility"),
        marpol_compliant: data.get("marpol_compliant") === "on",
        environmental_notes: field(data, "environmental_notes"),
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to register cylinder.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      const itemId = field(data, "catalogue_item_id");
      const qty = field(data, "quantity_requested");
      const price = Math.round(parseFloat(field(data, "unit_price") || "0") * 100);

      await marineStoresApi.createOrder({
        vessel_or_installation: field(data, "vessel_or_installation"),
        destination: field(data, "destination"),
        requested_delivery_date: field(data, "requested_delivery_date"),
        currency: field(data, "currency") || "NGN",
        notes: field(data, "notes"),
        line_items: [
          {
            catalogue_item_id: itemId,
            quantity_requested: qty,
            unit_price_minor: price,
            notes: field(data, "line_notes"),
          },
        ],
      });
      setMode(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to create store order.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (order: StoreOrder, action: string) => {
    if (action === "deliver") {
      setDeliverOrder(order);
      return;
    }
    setActionInProgress(order.id);
    try {
      await marineStoresApi.transitionOrder(order.id, action, order.version, `Executed action ${action}`);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(`Action '${action}' failed.`, 0));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCompleteDelivery = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!deliverOrder) return;
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      await marineStoresApi.transitionOrder(
        deliverOrder.id,
        "deliver",
        deliverOrder.version,
        "Delivery completed & signed",
        {
          receiving_officer_name: field(data, "receiving_officer_name"),
          receiving_signature_ref: field(data, "receiving_signature_ref"),
        }
      );
      setDeliverOrder(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to sign off delivery.", 0));
    } finally {
      setSaving(false);
    }
  };

  const handleRecoverCylinder = async (cyl: RefrigerantCylinder) => {
    setActionInProgress(cyl.id);
    try {
      await marineStoresApi.updateCylinder(cyl.id, {
        status: "recovered",
        environmental_notes: `Logged recovery at ${new Date().toISOString()}`,
      });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Failed to update cylinder status.", 0));
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Module 06
            </span>
            <span className="text-xs text-slate-400">MARPOL Annex VI & IMPA Ready</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">MarineStores Ledger</h1>
          <p className="text-sm text-slate-400">
            Ship spares, branded marine lubricants, provisions, medical expiry interlocks, and refrigerant compliance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode("order")}
            className="rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-cyan-500 transition"
          >
            + New Requisition Order
          </button>
          <button
            onClick={() => setMode("intake")}
            className="rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
          >
            + Goods Intake
          </button>
          <button
            onClick={() => setMode("cylinder")}
            className="rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
          >
            + Add Cylinder
          </button>
          <button
            onClick={() => setMode("catalogue")}
            className="rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
          >
            + Add Item Code
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p className="font-semibold">{error.message}</p>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400">Active Catalogue Items</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {summary ? summary.total_active_catalogue_items : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total {summary?.total_catalogue_items ?? 0} codes registered
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400">Low Stock Alerts</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {summary ? summary.low_stock_alerts_count : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Below minimum buffer</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400">Refrigerant Cylinders</p>
          <p className="mt-1 text-2xl font-bold text-cyan-400">
            {summary ? `${summary.in_service_cylinders} / ${summary.total_refrigerant_cylinders}` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary?.marpol_compliant_cylinders ?? 0} MARPOL compliant
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400">Active Requisitions</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {summary ? summary.pending_orders + summary.dispatched_orders : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary?.dispatched_orders ?? 0} en route to offshore vessels
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-4 text-sm font-medium">
        {(
          [
            ["orders", `Requisition Orders (${orders.length})`],
            ["inventory", `Stock Lots (${inventory.length})`],
            ["catalogue", `Catalogue (${catalogue.length})`],
            ["cylinders", `ODS Cylinders (${cylinders.length})`],
            ["movements", `Movement Ledger (${movements.length})`],
          ] as const
        ).map(([key, title]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`pb-3 px-1 border-b-2 transition ${
              activeTab === key
                ? "border-cyan-500 text-cyan-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {title}
          </button>
        ))}
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-sm text-slate-400">
              No marine requisition orders found. Click &quot;+ New Requisition Order&quot; to create one.
            </div>
          ) : (
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
              {orders.map((ord) => (
                <div key={ord.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">{ord.order_number}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${
                          ord.status === "delivered"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : ord.status === "dispatched"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : ord.status === "approved"
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {label(ord.status)}
                      </span>
                      <span className="text-xs text-slate-500">v{ord.version}</span>
                    </div>
                    <p className="text-sm text-slate-300">
                      Vessel: <span className="font-medium text-white">{ord.vessel_or_installation}</span> &bull; Destination: {ord.destination}
                    </p>
                    <div className="text-xs text-slate-400">
                      Req Date: {ord.requested_delivery_date} &bull; Total: {(ord.total_minor / 100).toLocaleString()} {ord.currency}
                      {ord.receiving_officer_name && ` • Signed: ${ord.receiving_officer_name}`}
                    </div>
                    {/* Line Items */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ord.line_items.map((li) => (
                        <span key={li.id} className="rounded bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300">
                          {li.item_name}: {li.quantity_requested} {li.unit_of_measure}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Transition Actions */}
                  <div className="flex items-center gap-2">
                    {ord.allowed_actions.map((act) => (
                      <button
                        key={act}
                        disabled={actionInProgress === ord.id}
                        onClick={() => handleTransition(ord, act)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          act === "approve"
                            ? "bg-indigo-600 text-white hover:bg-indigo-500"
                            : act === "dispatch"
                            ? "bg-cyan-600 text-white hover:bg-cyan-500"
                            : act === "deliver"
                            ? "bg-emerald-600 text-white hover:bg-emerald-500"
                            : "bg-red-900/60 text-red-200 hover:bg-red-800"
                        }`}
                      >
                        {label(act)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVENTORY LOTS */}
      {activeTab === "inventory" && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="p-3">Item Code & Name</th>
                <th className="p-3">Location</th>
                <th className="p-3">Lot / Serial</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Unit Cost</th>
                <th className="p-3">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {inventory.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/20">
                  <td className="p-3">
                    <p className="font-mono text-xs font-semibold text-cyan-400">{inv.item_code}</p>
                    <p className="text-white">{inv.item_name}</p>
                  </td>
                  <td className="p-3">{inv.location}</td>
                  <td className="p-3 text-xs text-slate-400 font-mono">
                    {inv.batch_or_lot_number || inv.serial_number || "—"}
                  </td>
                  <td className="p-3 font-semibold text-white">
                    {inv.quantity_on_hand} {inv.unit_of_measure}
                  </td>
                  <td className="p-3 text-xs">
                    {(inv.unit_cost_minor / 100).toLocaleString()} {inv.currency}
                  </td>
                  <td className="p-3 text-xs">
                    {inv.expires_on ? (
                      <span className="text-amber-400">{inv.expires_on}</span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: CATALOGUE */}
      {activeTab === "catalogue" && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="p-3">Code / IMPA</th>
                <th className="p-3">Description</th>
                <th className="p-3">Category</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Min Level</th>
                <th className="p-3">Stock on Hand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {catalogue.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-800/20">
                  <td className="p-3 font-mono text-xs">
                    <span className="text-cyan-400 font-bold">{cat.item_code}</span>
                    {cat.impa_code && <span className="block text-slate-500">IMPA: {cat.impa_code}</span>}
                  </td>
                  <td className="p-3 font-medium text-white">{cat.name}</td>
                  <td className="p-3">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {label(cat.category)}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-400">{cat.brand || "—"}</td>
                  <td className="p-3 text-xs text-slate-400">{cat.minimum_stock_level} {cat.unit_of_measure}</td>
                  <td className="p-3 font-semibold text-white">
                    {cat.total_stock_on_hand} {cat.unit_of_measure}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: CYLINDERS */}
      {activeTab === "cylinders" && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="p-3">Cylinder Serial</th>
                <th className="p-3">Gas Type</th>
                <th className="p-3">Weights (Tare / Gross / Net)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned Vessel</th>
                <th className="p-3">MARPOL VI</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {cylinders.map((cyl) => (
                <tr key={cyl.id} className="hover:bg-slate-800/20">
                  <td className="p-3 font-mono font-bold text-white">{cyl.cylinder_serial}</td>
                  <td className="p-3">
                    <span className="rounded bg-cyan-950 px-2 py-0.5 text-xs font-medium text-cyan-300">
                      {cyl.gas_type}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-mono text-slate-300">
                    {cyl.tare_weight_kg} / {cyl.gross_weight_kg} / <span className="font-bold text-emerald-400">{cyl.net_gas_weight_kg} kg</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs uppercase font-medium ${
                        cyl.status === "full"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : cyl.status === "in_service"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : cyl.status === "recovered"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {label(cyl.status)}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-300">{cyl.assigned_vessel_or_facility || "Warehouse"}</td>
                  <td className="p-3 text-xs">
                    {cyl.marpol_compliant ? (
                      <span className="text-emerald-400 font-medium">✓ Compliant</span>
                    ) : (
                      <span className="text-red-400 font-medium">✕ Non-Compliant</span>
                    )}
                  </td>
                  <td className="p-3">
                    {cyl.status !== "recovered" && (
                      <button
                        onClick={() => handleRecoverCylinder(cyl)}
                        disabled={actionInProgress === cyl.id}
                        className="rounded bg-purple-900/60 px-2.5 py-1 text-xs text-purple-200 hover:bg-purple-800 transition"
                      >
                        Log Recovery
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: MOVEMENTS AUDIT LEDGER */}
      {activeTab === "movements" && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Item</th>
                <th className="p-3">Type</th>
                <th className="p-3">Delta</th>
                <th className="p-3">Balance</th>
                <th className="p-3">Location</th>
                <th className="p-3">Operator</th>
                <th className="p-3">Reason / Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {movements.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-800/20">
                  <td className="p-3 text-xs text-slate-400">{new Date(mov.created_at).toLocaleString()}</td>
                  <td className="p-3 font-medium text-white">{mov.item_name}</td>
                  <td className="p-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                        mov.movement_type === "receipt"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : mov.movement_type === "issuance"
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {label(mov.movement_type)}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs font-bold text-white">{mov.quantity_delta}</td>
                  <td className="p-3 font-mono text-xs text-slate-400">{mov.resulting_quantity}</td>
                  <td className="p-3 text-xs text-slate-300">{mov.location}</td>
                  <td className="p-3 text-xs text-slate-400">{mov.actor_name || "System"}</td>
                  <td className="p-3 text-xs text-slate-400">{mov.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: NEW REQUISITION ORDER */}
      {mode === "order" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">Create Store Requisition Order</h2>
            <p className="mt-1 text-xs text-slate-400">Order is created in Draft status with version locking.</p>
            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Vessel or Installation</label>
                <input
                  name="vessel_or_installation"
                  required
                  placeholder="e.g. MT Ocean Venture / Bonny Platform"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Destination</label>
                <input
                  name="destination"
                  required
                  placeholder="e.g. Onne Port Gantry / Escravos Terminal"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Requested Delivery Date</label>
                  <input
                    name="requested_delivery_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Currency</label>
                  <input
                    name="currency"
                    defaultValue="NGN"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <p className="text-xs font-semibold text-slate-300">Line Item</p>
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="block text-xs text-slate-400">Catalogue Item</label>
                    <select
                      name="catalogue_item_id"
                      required
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    >
                      {catalogue.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.item_code} - {cat.name} ({cat.unit_of_measure})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400">Quantity Requested</label>
                      <input
                        name="quantity_requested"
                        type="number"
                        step="0.01"
                        required
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400">Unit Price</label>
                      <input
                        name="unit_price"
                        type="number"
                        step="0.01"
                        defaultValue="0"
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500"
                >
                  {saving ? "Creating..." : "Create Requisition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GOODS INTAKE */}
      {mode === "intake" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">Record Goods Receipt / Intake</h2>
            <p className="mt-1 text-xs text-slate-400">Directly adds inventory lots and logs an immutable audit event.</p>
            <form onSubmit={handleRecordIntake} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Catalogue Item</label>
                <select
                  name="item_id"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  {catalogue.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.item_code} - {cat.name} ({cat.unit_of_measure})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Location</label>
                  <input
                    name="location"
                    required
                    placeholder="e.g. Onne Yard Bay 3"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    step="0.01"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Batch / Lot Number</label>
                  <input
                    name="batch_or_lot_number"
                    placeholder="e.g. LOT-2026-X8"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Expiry Date (if applicable)</label>
                  <input
                    name="expires_on"
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Receipt Reason / Notes</label>
                <input
                  name="reason"
                  placeholder="Direct delivery from Shell lubricant depot"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500"
                >
                  {saving ? "Recording..." : "Record Intake"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CYLINDER */}
      {mode === "cylinder" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">Register Refrigerant Cylinder</h2>
            <p className="mt-1 text-xs text-slate-400">MARPOL Annex VI ozone depleting substances compliance registry.</p>
            <form onSubmit={handleCreateCylinder} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Cylinder Serial</label>
                  <input
                    name="cylinder_serial"
                    required
                    placeholder="e.g. CYL-R404A-1082"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Gas Type</label>
                  <select
                    name="gas_type"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="R404A">R404A</option>
                    <option value="R134a">R134a</option>
                    <option value="R407C">R407C</option>
                    <option value="R22">R22</option>
                    <option value="R507">R507</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Tare Weight (kg)</label>
                  <input
                    name="tare_weight_kg"
                    type="number"
                    step="0.01"
                    required
                    placeholder="14.50"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Gross Weight (kg)</label>
                  <input
                    name="gross_weight_kg"
                    type="number"
                    step="0.01"
                    required
                    placeholder="24.50"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Assigned Vessel / Location</label>
                <input
                  name="assigned_vessel_or_facility"
                  placeholder="e.g. MT Marine Pioneer / Onne HVAC Workshop"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="marpol_compliant"
                  type="checkbox"
                  defaultChecked
                  id="marpol_compliant"
                  className="rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="marpol_compliant" className="text-xs text-slate-300">
                  MARPOL Annex VI Compliant (Proper Logged Tare & Valve Seal)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500"
                >
                  {saving ? "Registering..." : "Register Cylinder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATALOGUE ITEM */}
      {mode === "catalogue" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">Register Catalogue Item Code</h2>
            <form onSubmit={handleCreateCatalogue} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Item Code</label>
                  <input
                    name="item_code"
                    required
                    placeholder="e.g. LUB-5001"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Category</label>
                  <select
                    name="category"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  >
                    <option value="ship_spares">Ship Spares (Deck & Engine)</option>
                    <option value="lubricants">Marine Lubricants</option>
                    <option value="provisions">Bonded Stores & Provisions</option>
                    <option value="medical">Medical Supplies</option>
                    <option value="gases">Refrigerant Gases</option>
                    <option value="safety_ppe">Safety & PPE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Item Name / Description</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Mobilgard 412 Trunk Piston Engine Oil"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Unit of Measure</label>
                  <input
                    name="unit_of_measure"
                    defaultValue="piece"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Brand</label>
                  <input
                    name="brand"
                    placeholder="e.g. Mobil, Shell"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">IMPA Code</label>
                  <input
                    name="impa_code"
                    placeholder="e.g. 590101"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Minimum Stock Level</label>
                <input
                  name="minimum_stock_level"
                  type="number"
                  defaultValue="0"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-500"
                >
                  {saving ? "Saving..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELIVER & SIGN OFF */}
      {deliverOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">Sign Off Delivery: {deliverOrder.order_number}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Vessel {deliverOrder.vessel_or_installation}. Record receiving officer signature reference.
            </p>
            <form onSubmit={handleCompleteDelivery} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Receiving Officer Name</label>
                <input
                  name="receiving_officer_name"
                  required
                  placeholder="e.g. Chief Engineer K. Okon"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Signature Reference / Stamp Code</label>
                <input
                  name="receiving_signature_ref"
                  required
                  placeholder="e.g. SIG-OV-8812-OKON"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeliverOrder(null)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  {saving ? "Signing off..." : "Confirm Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
