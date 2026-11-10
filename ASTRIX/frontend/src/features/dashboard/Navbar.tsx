import { Database, Download, FilePlus2, Loader2, Radio, Siren } from "lucide-react";
import { api } from "../../lib/api";

export default function Navbar({ connected, seeding, onSeed }: { connected: boolean; seeding: boolean; onSeed: () => void }) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur z-20">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-red-600 grid place-items-center shadow-[0_0_14px_rgba(239,68,68,.6)]">
          <Siren size={18} />
        </div>
        <h1 className="font-bold tracking-wide text-sm sm:text-base">
          ASTRIX <span className="text-slate-400 font-medium hidden sm:inline">Emergency Command Center</span>
        </h1>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 ${
            connected ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/40" : "bg-red-500/10 text-red-300 ring-red-500/40"
          }`}
          title={connected ? "WebSocket connected" : "Reconnecting…"}
        >
          <span className="relative flex h-2 w-2">
            {connected && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
          </span>
          <Radio size={12} className="hidden sm:block" />
          {connected ? "LIVE" : "OFFLINE"}
        </span>
        <a href="/report" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-slate-700">
          <FilePlus2 size={13} /> <span className="hidden md:inline">Report</span>
        </a>
        <a href={api.exportCsvUrl} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-slate-700">
          <Download size={13} /> <span className="hidden md:inline">CSV</span>
        </a>
        <button
          onClick={onSeed}
          disabled={seeding}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 font-semibold"
        >
          {seeding ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />} Seed Demo Data
        </button>
      </div>
    </header>
  );
}
