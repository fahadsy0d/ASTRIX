import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, MapPin, Phone, Route, Trash2, X, Zap } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { CAT_EMOJI, NEXT_STATUS, SEV, STATUSES, STATUS_HEX, TEAM_HEX, VEHICLE } from "../../lib/constants";
import { elapsed, fmtTime } from "../../lib/format";
import type { Team } from "../../lib/types";

export default function IncidentModal({
  id, teams, now, busy, onClose, onAutoAssign, onAssign, onAdvance, onDelete,
}: {
  id: string;
  teams: Team[];
  now: number;
  busy: boolean;
  onClose: () => void;
  onAutoAssign: (id: string) => void;
  onAssign: (id: string, teamId: string) => void;
  onAdvance: (id: string, status: (typeof STATUSES)[number]) => void;
  onDelete: (id: string) => void;
}) {
  const q = useQuery({ queryKey: ["incident", id], queryFn: () => api.incident(id) });
  const [pick, setPick] = useState("");
  const inc = q.data;
  const free = teams.filter((t) => t.status === "Available");

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 grid place-items-center p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-full overflow-y-auto rounded-2xl bg-slate-900 ring-1 ring-slate-700" onClick={(e) => e.stopPropagation()}>
        {!inc ? (
          <div className="p-12 grid place-items-center text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <>
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur flex items-start justify-between gap-3 p-5 border-b border-slate-800 z-10">
              <div>
                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                  <span className={`font-bold px-1.5 py-0.5 rounded ring-1 ${SEV[inc.severity].chip}`}>{inc.severity.toUpperCase()}</span>
                  <span className="text-slate-400">{CAT_EMOJI[inc.category]} {inc.category}</span>
                  <span className="text-slate-600">#{inc.id}</span>
                </div>
                <h2 className="mt-1 text-lg font-bold leading-snug">{inc.title}</h2>
                <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap mt-1">
                  <span className="flex items-center gap-1"><MapPin size={12} />{inc.location}</span>
                  <span>👥 {inc.people_affected}</span>
                  {inc.contact && <span className="flex items-center gap-1"><Phone size={11} />{inc.contact}</span>}
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-sm text-slate-300">{inc.description}</p>

              {/* Progress stepper */}
              <div className="flex items-center">
                {STATUSES.map((s, idx) => {
                  const cur = STATUSES.indexOf(inc.status);
                  const done = idx <= cur;
                  return (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1 w-16">
                        <div
                          className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold border-2 transition"
                          style={{ borderColor: done ? STATUS_HEX[s] : "#334155", background: idx < cur || (s === "Resolved" && done) ? STATUS_HEX[s] : "transparent", color: idx < cur || (s === "Resolved" && done) ? "#0f172a" : done ? STATUS_HEX[s] : "#64748b" }}
                        >
                          {idx < cur || (s === "Resolved" && done) ? <Check size={15} strokeWidth={3} /> : idx + 1}
                        </div>
                        <span className={`text-[10px] text-center leading-tight ${done ? "text-slate-200" : "text-slate-500"}`}>{s}</span>
                      </div>
                      {idx < STATUSES.length - 1 && <div className="flex-1 h-0.5 -mt-4" style={{ background: idx < cur ? STATUS_HEX[STATUSES[idx + 1]] : "#334155" }} />}
                    </div>
                  );
                })}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Assignment */}
                <div className="rounded-xl bg-slate-950/60 ring-1 ring-slate-800 p-4">
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5"><Route size={13} /> Assigned Team</div>
                  {inc.assigned_team ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-lg grid place-items-center text-xl" style={{ border: `2px solid ${TEAM_HEX[inc.assigned_team.status]}` }}>
                          {VEHICLE[inc.assigned_team.category]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{inc.assigned_team.name}</div>
                          <div className="text-[11px] text-slate-500">{inc.assigned_team.id} · {inc.assigned_team.contact_number}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-slate-900 py-2"><div className="text-lg font-bold text-sky-300">{inc.distance_km ?? "–"}<span className="text-xs"> km</span></div><div className="text-[10px] text-slate-500">distance</div></div>
                        <div className="rounded-lg bg-slate-900 py-2"><div className="text-lg font-bold text-sky-300">{inc.eta_minutes ?? "–"}<span className="text-xs"> min</span></div><div className="text-[10px] text-slate-500">ETA @ 40 km/h</div></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No team assigned yet.</div>
                  )}

                  {(inc.status === "Reported" || inc.status === "Assigned") && (
                    <div className="mt-3 space-y-2">
                      {inc.status === "Reported" && (
                        <button disabled={busy} onClick={() => onAutoAssign(inc.id)} className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60">
                          <Zap size={13} /> Auto-Dispatch Nearest
                        </button>
                      )}
                      <div className="flex gap-2">
                        <select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 min-w-0 bg-slate-900 ring-1 ring-slate-700 rounded-lg px-2 py-1.5 text-xs">
                          <option value="">{inc.status === "Assigned" ? "Re-assign to…" : "Or pick a team…"}</option>
                          {free.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.category}</option>)}
                        </select>
                        <button disabled={!pick || busy} onClick={() => { onAssign(inc.id, pick); setPick(""); }} className="text-xs px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 ring-1 ring-slate-700">Assign</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="rounded-xl bg-slate-950/60 ring-1 ring-slate-800 p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Priority Score</span>
                    <span className="text-2xl font-extrabold" style={{ color: SEV[inc.severity].hex }}>{inc.priority_score}<span className="text-xs text-slate-500">/100</span></span>
                  </div>
                  <div className="space-y-2">
                    {inc.priority_breakdown?.components.map((c) => (
                      <div key={c.key}>
                        <div className="flex justify-between text-[11px] text-slate-400"><span>{c.label}</span><span className="tabular-nums">+{c.points}</span></div>
                        <div className="h-1.5 rounded bg-slate-800"><div className="h-full rounded bg-sky-500" style={{ width: `${(c.points / c.max) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-600">Waiting-time points stop growing once a team is assigned.</div>
                </div>
              </div>

              {/* Audit log */}
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-2">Audit Log</div>
                <div className="rounded-xl ring-1 ring-slate-800 divide-y divide-slate-800 overflow-hidden text-xs">
                  {[...inc.history].reverse().map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-950/40">
                      <div className="min-w-0">
                        <span className="text-slate-500">{h.old_status ?? "∅"}</span> → <b style={{ color: STATUS_HEX[h.new_status as keyof typeof STATUS_HEX] }}>{h.new_status}</b>
                        <span className="text-slate-500"> · {h.changed_by}</span>
                        {h.note && <div className="text-[11px] text-slate-500 truncate">{h.note}</div>}
                      </div>
                      <span className="text-slate-500 shrink-0">{fmtTime(h.timestamp)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-500">
                  {inc.status === "Resolved" ? `Total response time: ${inc.response_time_mins} min` : `Open for ${elapsed(inc.created_at, now)}`}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => confirm("Delete this incident?") && onDelete(inc.id)} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                {NEXT_STATUS[inc.status] && inc.status !== "Reported" && (
                  <button disabled={busy} onClick={() => onAdvance(inc.id, NEXT_STATUS[inc.status]!)} className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60">
                    Mark {NEXT_STATUS[inc.status]}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
