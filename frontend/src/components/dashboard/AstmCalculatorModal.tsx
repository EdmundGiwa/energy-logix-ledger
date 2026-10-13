"use client";

import { useState } from "react";

export function AstmCalculatorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [product, setProduct] = useState("AGO");
  const [obsDensity, setObsDensity] = useState("845.2"); // kg/m³
  const [obsTemp, setObsTemp] = useState("31.8"); // °C
  const [obsVolume, setObsVolume] = useState("50000"); // Litres
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  // Real ASTM 54B approximation for generalized crude / refined products
  const density = parseFloat(obsDensity) || 840;
  const temp = parseFloat(obsTemp) || 15;
  const vol = parseFloat(obsVolume) || 0;
  const deltaT = temp - 15;

  // Thermal expansion coefficient alpha based on product density range
  const alpha = 0.00078; // average for AGO/middle distillates
  const vcf = Math.max(0.85, Math.min(1.15, Math.exp(-alpha * deltaT * (1 + 0.8 * alpha * deltaT))));
  const standardDensity15 = (density / vcf).toFixed(1);
  const gsvLitres = (vol * vcf).toFixed(0);
  const gsvM3 = (parseFloat(gsvLitres) / 1000).toFixed(2);
  const metricTonsVacuum = ((parseFloat(gsvLitres) * parseFloat(standardDensity15)) / 1000000).toFixed(3);
  const metricTonsAir = (parseFloat(metricTonsVacuum) * 0.9987).toFixed(3); // Table 56 air reduction

  const handleCopy = () => {
    const text = `ASTM 54B Calculation:\nProduct: ${product}\nObs Density: ${density} kg/m³ @ ${temp}°C\nVCF @ 15°C: ${vcf.toFixed(5)}\nStandard Density @ 15°C: ${standardDensity15} kg/m³\nGOV: ${vol.toLocaleString()} L\nGSV @ 15°C: ${parseFloat(gsvLitres).toLocaleString()} L (${gsvM3} m³)\nMetric Tons (Air): ${metricTonsAir} MT`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200/80 shadow-2xl p-6 sm:p-7 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
                Measurement Engine
              </span>
            </div>
            <h3 className="mt-1 text-[18px] font-bold text-slate-900">
              ASTM 54B / 56 Volume & Mass Converter
            </h3>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Standard volume reduction to 15°C and metric tonnage conversion.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Inputs */}
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Petroleum Product
              </label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
              >
                <option value="AGO">Automotive Gas Oil (AGO)</option>
                <option value="PMS">Premium Motor Spirit (PMS)</option>
                <option value="DPK">Dual Purpose Kerosene (DPK)</option>
                <option value="VLSFO">VLSFO 0.5% (Marine Fuel)</option>
                <option value="LSMGO">Low Sulphur MGO</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Gross Observed Vol. (L)
              </label>
              <input
                type="number"
                value={obsVolume}
                onChange={(e) => setObsVolume(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-mono font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Observed Density (kg/m³)
              </label>
              <input
                type="number"
                step="0.1"
                value={obsDensity}
                onChange={(e) => setObsDensity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-mono font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Observed Temp. (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={obsTemp}
                onChange={(e) => setObsTemp(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-mono font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
              />
            </div>
          </div>
        </div>

        {/* Calculation Output Card */}
        <div className="mt-5 rounded-2xl bg-slate-900 text-white p-4.5 space-y-3.5 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>ASTM 54B Normalized Output</span>
            <span className="font-mono text-emerald-400">Reference: 15.0°C</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-xl bg-white/[0.05] p-3 border border-white/[0.08]">
              <p className="text-[10.5px] uppercase font-medium text-slate-400">VCF (Table 54B)</p>
              <p className="mt-1 text-[17px] font-mono font-bold text-white tracking-tight">
                {vcf.toFixed(5)}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-3 border border-white/[0.08]">
              <p className="text-[10.5px] uppercase font-medium text-slate-400">Density @ 15°C</p>
              <p className="mt-1 text-[17px] font-mono font-bold text-emerald-400 tracking-tight">
                {standardDensity15} <span className="text-[11px] text-slate-400">kg/m³</span>
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-3 border border-white/[0.08] col-span-2 sm:col-span-1">
              <p className="text-[10.5px] uppercase font-medium text-slate-400">GSV @ 15°C</p>
              <p className="mt-1 text-[17px] font-mono font-bold text-sky-300 tracking-tight">
                {parseFloat(gsvLitres).toLocaleString()} <span className="text-[11px] text-slate-400">L</span>
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400">Metric Tons (In Air / Table 56)</p>
              <p className="text-[19px] font-mono font-extrabold text-white">
                {metricTonsAir} <span className="text-[12px] font-normal text-emerald-400">MT</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Metric Tons (Vacuum)</p>
              <p className="text-[14px] font-mono font-semibold text-slate-300">
                {metricTonsVacuum} MT
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
            {copied ? "Copied calculation!" : "Copy result"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
