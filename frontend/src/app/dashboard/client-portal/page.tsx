"use client";

import { useState } from "react";

interface DocumentRecord {
  id: string;
  type: string;
  title: string;
  asset: string;
  client: string;
  date: string;
  status: "Verified" | "Signed" | "Archived";
  hash: string;
  size: string;
}

const clientList = [
  { id: "shell", name: "Shell Petroleum Dev. Co. (SPDC)", code: "SPDC-NIG" },
  { id: "chevron", name: "Chevron Nigeria Ltd (CNL)", code: "CNL-ESC" },
  { id: "total", name: "TotalEnergies EP Nigeria", code: "TTE-EGINA" },
  { id: "dangote", name: "Dangote Oil Refinery & Petrochemicals", code: "DORP-LEK" },
  { id: "nlng", name: "Nigeria LNG Limited (NLNG)", code: "NLNG-BNY" },
];

const mockDocuments: DocumentRecord[] = [
  {
    id: "BDN-2026-0419",
    type: "Electronic Bunker Delivery Note",
    title: "VLSFO 0.5% Bunkering Stem — 1,250.00 MT",
    asset: "MT Sea Venture (IMO 9482104)",
    client: "shell",
    date: "10 Oct 2026, 14:20 WAT",
    status: "Verified",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    size: "2.4 MB (e-BDN + Lab COA)",
  },
  {
    id: "HT-2026-088",
    type: "Pipeline Hydrotest Certificate",
    title: "18-inch Escravos TL Pressure Hold (24 hr @ 142 bar)",
    asset: "Trunkline TL-04 (KP 0.0 - KP 48.2)",
    client: "chevron",
    date: "09 Oct 2026, 09:15 WAT",
    status: "Verified",
    hash: "a4f89d3197ef4231b415a9e70198ca7832ef12401824a7329184ba713028cd19",
    size: "6.8 MB (Pressure Curves + Sign-off)",
  },
  {
    id: "POD-2026-1184",
    type: "Proof of Delivery & Weighbridge Slip",
    title: "AGO Bulk Road Discharge — 45,000 Litres",
    asset: "Truck NG-LAG-4418 / Compartment A-C",
    client: "dangote",
    date: "08 Oct 2026, 17:40 WAT",
    status: "Signed",
    hash: "7d12f841029abce8241097e415b390141a029341857102947190581023941829",
    size: "1.2 MB (Weighbridge + Water-Paste)",
  },
  {
    id: "NDT-2026-0312",
    type: "Radiographic Weld Inspection & UT Log",
    title: "Flowstation Header Welds W-101 through W-144",
    asset: "Otumara Flowstation Manifold",
    client: "shell",
    date: "07 Oct 2026, 11:00 WAT",
    status: "Verified",
    hash: "5c84a09182390147981240185918237401928471902847192084719208371902",
    size: "4.1 MB (RT Films + NDT Dossier)",
  },
  {
    id: "NCFCC-2026-Q3",
    type: "NCDMB Local Content Spend Certificate",
    title: "Nigerian Content Performance Dossier (NOGIC-JQS)",
    asset: "PetroLedger Core Contract PL-2026-77",
    client: "total",
    date: "05 Oct 2026, 16:30 WAT",
    status: "Verified",
    hash: "3b09184710293847109283740192837401928374019283740192837401928374",
    size: "8.5 MB (NCFCC Audit Pack)",
  },
  {
    id: "CIPS-2026-004",
    type: "Cathodic Protection Survey Log",
    title: "Close Interval Potential Survey (CIPS) - Section B",
    asset: "Bonny Export Trunkline (KP 12 - KP 34)",
    client: "nlng",
    date: "04 Oct 2026, 13:10 WAT",
    status: "Signed",
    hash: "9182736450192837465019283746501928374650192837465019283746501928",
    size: "3.7 MB (Potential Graphs + Anode Map)",
  },
];

export default function ClientPortalPage() {
  const [selectedClient, setSelectedClient] = useState("shell");
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const filteredDocs = mockDocuments.filter((d) => d.client === selectedClient);
  const currentClient = clientList.find((c) => c.id === selectedClient);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-800">
            <span className="h-1.5 w-1.5 rounded-sm bg-sky-600" />
            Module 11: Client Portal
          </span>
          <h1 className="mt-3 text-[1.65rem] font-extrabold tracking-[-0.03em] text-slate-900">
            External Client & IOC Audit Portal
          </h1>
          <p className="mt-1 text-[14px] text-slate-500 max-w-2xl">
            Read-only verified access for International Oil Companies (IOCs), EPC principals, and refinery dispatchers.
            Inspect cryptographic e-BDNs, hydrotest hold charts, POD tickets, and NCDMB certifications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Packaging signed audit dossier with NUPRC & NCDMB certificates...")}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800 transition shrink-0"
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export Client Audit Pack
        </button>
      </div>

      {/* Trust & Integrity Bar */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1f33] via-[#0f2d4a] to-[#0b1f33] p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-bold text-white flex items-center gap-2">
              Cryptographically Verified Audit Chain
              <span className="rounded-md bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10.5px] font-mono text-emerald-300">
                SHA-256
              </span>
            </p>
            <p className="text-[12px] text-slate-300 mt-0.5">
              All documents are sealed with timestamped hash signatures, preventing retrospective alterations in compliance with NUPRC and ISO 9001.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12px] text-slate-300 shrink-0 font-mono">
          <div className="border-l border-white/10 pl-4">
            <span className="text-slate-400 block text-[10px] uppercase">Active Session</span>
            <span className="text-emerald-400 font-bold">256-bit TLS Sealed</span>
          </div>
        </div>
      </div>

      {/* Client Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {clientList.map((client) => {
          const active = selectedClient === client.id;
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => setSelectedClient(client.id)}
              className={`rounded-xl px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 border ${
                active
                  ? "bg-white border-slate-300 text-slate-900 shadow-xs ring-2 ring-sky-500/20"
                  : "bg-slate-100/70 border-slate-200/60 text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              <span>{client.name}</span>
              <span className="ml-2 font-mono text-[11px] text-slate-400 font-normal">
                ({client.code})
              </span>
            </button>
          );
        })}
      </div>

      {/* Document Ledger Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">
              Verified Dossiers & Artifacts: {currentClient?.name}
            </h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Showing {filteredDocs.length} signed operational records ready for IOC audit inspection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-500">
              <span>Filter:</span>
              <span className="ml-1 font-semibold text-slate-800">All Categories</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-5">Ref / ID</th>
                <th className="py-3.5 px-5">Document Title</th>
                <th className="py-3.5 px-5">Asset / Facility</th>
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {filteredDocs.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  onClick={() => setActiveDoc(doc)}
                >
                  <td className="py-4 px-5">
                    <span className="font-mono font-bold text-slate-900 group-hover:text-sky-600 transition">
                      {doc.id}
                    </span>
                    <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                      {doc.size}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <p className="font-semibold text-slate-900">{doc.title}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">{doc.type}</p>
                  </td>
                  <td className="py-4 px-5">
                    <span className="font-medium text-slate-800">{doc.asset}</span>
                  </td>
                  <td className="py-4 px-5 font-mono text-[12px] text-slate-500">
                    {doc.date}
                  </td>
                  <td className="py-4 px-5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDoc(doc);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                      Verify Hash
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Drawer / Modal */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setActiveDoc(null)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                  Cryptographic Audit Record
                </span>
                <h3 className="mt-1 text-[17px] font-bold text-slate-900">
                  {activeDoc.title}
                </h3>
                <p className="text-[12px] font-mono text-slate-500 mt-0.5">
                  Reference: {activeDoc.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Asset</span>
                  <p className="mt-1 font-semibold text-slate-800">{activeDoc.asset}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Date / WAT</span>
                  <p className="mt-1 font-semibold text-slate-800 font-mono text-[12px]">{activeDoc.date}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">
                  SHA-256 Merkle Audit Hash
                </span>
                <div className="mt-1.5 rounded-xl bg-slate-900 text-emerald-400 p-3 font-mono text-[11px] break-all leading-relaxed border border-slate-800">
                  {activeDoc.hash}
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200/90 p-3.5 text-emerald-900 text-[12.5px] flex items-start gap-2.5">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold">Digital Signature Authenticated</p>
                  <p className="text-emerald-700 mt-0.5">
                    Attributed to registered PetroLedger authorized signatory and Chief Engineer. Compliant with NUPRC, NMDPRA, and MARPOL Annex VI regulations.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleCopyHash(activeDoc.hash)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                {copiedHash ? "Hash copied!" : "Copy SHA-256 hash"}
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Downloading complete audit package for ${activeDoc.id}...`);
                  setActiveDoc(null);
                }}
                className="rounded-xl bg-sky-600 px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-sky-500 transition"
              >
                Download Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
