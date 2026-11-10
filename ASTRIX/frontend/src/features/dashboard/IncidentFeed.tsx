import { Clock, Loader2, MapPin, Search, Users, Zap } from "lucide-react";
import { useState } from "react";
import type { Category, Incident } from "../../lib/types";
import { CATEGORIES, CAT_EMOJI, SEV, STATUS_HEX, TEAM_HEX } from "../../lib/constants";
import { elapsed } from "../../lib/format";

export default function IncidentFeed({
  incidents, now, selectedId, busyId, onOpen, onAutoAssign,
}: {
  incidents: Incident[];
  now: number;
  selectedId?: string | null;
  busyId?: string | null;
  onOpen: (id: string) => void;
  onAutoAssign: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");
  const [showResolved, setShowResolved] = useState(false);

  const list = incidents.filter((i) => {
    if (!showResolved && i.status === "Resolved") return false;
    if (cat !== "All" && i.category !== cat) return false;
    const s = q.trim().toLowerCase();
    return !s || `${i.title} ${i.location} ${i.description}`.toLowerCase().includes(s);
  });

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="space-y-2 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search incidents or locations…"
            className="w-full bg-slate-900 ring-1 ring-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-sky-500"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full ring-1 ${
                cat === c ? "bg-sky-500/20 text-sky-200 ring-sky-500/60" : "bg-slate-900 text-slate-400 ring-slate-800 hover:text-slate-200"
              }`}
            >
              {c === "All" ? "All" : `${CAT_EMOJI[c]} ${c.split(" ")[0]}`}
            </button>
          ))}
          <button
            onClick={() => setShowResolved((v) => !v)}
            className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full ring-1 ${
              showResolved ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/60" : "bg-slate-900 text-slate-400 ring-slate-800"
            }`}
          >
            ✓ Resolved
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {list.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-12">
            No incidents here. Use <b>Seed Demo Data</b> or file a report.
          </div>
        )}
        {list.map((i) => {
          const sev = SEV[i.severity];
          const canAssign = i.status === "Reported";
          return (
            <div
              key={i.id}
              onClick={() => onOpen(i.id)}
              className={`cursor-pointer rounded-xl bg-slate-900 ring-1 border-l-4 ${sev.bar} p-3 transition hover:bg-slate-800/80 ${
                selectedId === i.id ? "ring-sky-500" : "ring-slate-800"
              } ${i.status === "Resolved" ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 ${sev.chip} ${i.severity === "Critical" && i.status !== "Resolved" ? "pulse-critical" : ""}`}>
                      {i.severity.toUpperCase()}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded ring-1 ring-slate-700 text-slate-300">
                      {CAT_EMOJI[i.category]} {i.category}
                    </span>
                    {i.report_count > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/40">
                        ×{i.report_count} reports
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold leading-snug">{i.title}</h3>
                </div>
                <div className="text-right shrink-0" title={i.priority_breakdown?.summary}>
                  <div className="text-2xl font-extrabold leading-none tabular-nums" style={{ color: sev.hex }}>
                    {i.priority_score.toFixed(0)}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">priority</div>
                </div>
              </div>

              <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><MapPin size={11} />{i.location}</span>
                <span className="flex items-center gap-1"><Users size={11} />{i.people_affected}</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {i.status === "Resolved" ? `resolved in ${i.response_time_mins ?? "–"} min` : elapsed(i.created_at, now)}
                </span>
                <span className="font-medium" style={{ color: STATUS_HEX[i.status] }}>● {i.status}</span>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                {i.assigned_team ? (
                  <div className="text-[11px] text-slate-300 truncate">
                    <span style={{ color: TEAM_HEX[i.assigned_team.status] }}>●</span> {i.assigned_team.id}
                    {i.distance_km != null && <span className="text-slate-500"> · {i.distance_km} km · ETA {i.eta_minutes} min</span>}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">No team assigned</span>
                )}
                {canAssign && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAutoAssign(i.id); }}
                    disabled={busyId === i.id}
                    className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60"
                  >
                    {busyId === i.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Auto-Assign Nearest Team
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
