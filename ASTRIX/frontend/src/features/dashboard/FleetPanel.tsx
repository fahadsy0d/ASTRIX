import { Phone, Plus, Trash2 } from "lucide-react";
import type { Incident, Team, TeamStatus } from "../../lib/types";
import { TEAM_HEX, VEHICLE } from "../../lib/constants";

export default function FleetPanel({
  teams, incidents, onToggle, onDelete, onAdd, onOpenIncident,
}: {
  teams: Team[];
  incidents: Incident[];
  onToggle: (id: string, status: TeamStatus) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onOpenIncident: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <button
        onClick={onAdd}
        className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-slate-800 hover:bg-slate-700 ring-1 ring-slate-700"
      >
        <Plus size={14} /> Register Response Team
      </button>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {teams.length === 0 && <div className="text-center text-slate-500 text-sm py-12">No teams registered yet.</div>}
        {teams.map((t) => {
          const inc = incidents.find((i) => i.id === t.assigned_incident_id);
          const locked = !!t.assigned_incident_id;
          const hex = TEAM_HEX[t.status];
          return (
            <div key={t.id} className="rounded-xl bg-slate-900 ring-1 ring-slate-800 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-lg grid place-items-center text-lg shrink-0" style={{ border: `2px solid ${hex}`, boxShadow: `0 0 8px ${hex}55` }}>
                    {VEHICLE[t.category]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{t.name}</div>
                    <div className="text-[11px] text-slate-500">{t.id} · {t.category}</div>
                    <div className="text-[11px] text-slate-400 truncate">{t.current_location_name}</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 shrink-0" style={{ color: hex, borderColor: hex, background: `${hex}1f`, boxShadow: `inset 0 0 0 1px ${hex}66` }}>
                  {t.status}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                {inc ? (
                  <button onClick={() => onOpenIncident(inc.id)} className="text-amber-300 hover:underline truncate text-left">
                    ➜ {inc.title}
                  </button>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    {t.contact_number && <><Phone size={10} /> {t.contact_number}</>}
                  </span>
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    disabled={locked}
                    onClick={() => onToggle(t.id, t.status === "Offline" ? "Available" : "Offline")}
                    title={locked ? "Resolve the incident to free this team" : "Toggle Available / Offline"}
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed ring-1 ring-slate-700"
                  >
                    {t.status === "Offline" ? "Bring online" : "Set offline"}
                  </button>
                  <button
                    disabled={locked}
                    onClick={() => confirm(`Remove ${t.id}?`) && onDelete(t.id)}
                    className="p-1.5 rounded-md text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Delete team"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
