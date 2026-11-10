import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Eye, EyeOff, ListOrdered, Map as MapIcon, Route, Truck } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../hooks/useLive";
import { useNow } from "../../lib/format";
import type { Status, TeamStatus } from "../../lib/types";
import Navbar from "./Navbar";
import KpiRibbon from "./KpiRibbon";
import IncidentFeed from "./IncidentFeed";
import FleetPanel from "./FleetPanel";
import MapView from "./MapView";
import AnalyticsPanel from "./AnalyticsPanel";
import IncidentModal from "./IncidentModal";
import TeamFormModal from "./TeamFormModal";

type Toast = { msg: string; kind: "ok" | "err" };

export default function Dashboard() {
  const qc = useQueryClient();
  const connected = useLive();
  const now = useNow();
  const [left, setLeft] = useState<"incidents" | "fleet">("incidents");
  const [right, setRight] = useState<"map" | "analytics">("map");
  const [showTeams, setShowTeams] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const incidents = useQuery({ queryKey: ["incidents"], queryFn: api.incidents, refetchInterval: 30000 });
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats });

  const refresh = () => ["incidents", "incident", "teams", "stats"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const fail = (e: unknown) => setToast({ msg: (e as Error).message, kind: "err" });

  const autoAssign = useMutation({
    mutationFn: (id: string) => api.autoAssign(id),
    onSuccess: (r) => {
      setToast({ msg: `${r.team.id} dispatched — ${r.distance_km} km away, ETA ${r.eta_minutes} min`, kind: "ok" });
      setFocusId(r.incident.id);
      refresh();
    },
    onError: fail,
  });
  const assign = useMutation({
    mutationFn: ({ id, teamId }: { id: string; teamId: string }) => api.assign(id, teamId),
    onSuccess: (r) => { setToast({ msg: `${r.team.id} assigned — ${r.distance_km} km, ETA ${r.eta_minutes} min`, kind: "ok" }); refresh(); },
    onError: fail,
  });
  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => api.setStatus(id, status),
    onSuccess: (i) => { setToast({ msg: `Incident moved to ${i.status}`, kind: "ok" }); refresh(); },
    onError: fail,
  });
  const removeIncident = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => { setOpenId(null); refresh(); },
    onError: fail,
  });
  const seed = useMutation({
    mutationFn: api.seed,
    onSuccess: () => { setToast({ msg: "Demo data loaded: 6 incidents, 8 response teams", kind: "ok" }); refresh(); },
    onError: fail,
  });
  const toggleTeam = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TeamStatus }) => api.setTeamStatus(id, status),
    onSuccess: refresh,
    onError: fail,
  });
  const removeTeam = useMutation({ mutationFn: (id: string) => api.removeTeam(id), onSuccess: refresh, onError: fail });
  const createTeam = useMutation({
    mutationFn: api.createTeam,
    onSuccess: (t) => { setTeamForm(false); setToast({ msg: `Registered ${t.id}`, kind: "ok" }); refresh(); },
  });

  const inc = incidents.data ?? [];
  const tm = teams.data ?? [];
  const busyId = autoAssign.isPending ? autoAssign.variables : null;
  const open = (id: string) => { setOpenId(id); setFocusId(id); };

  const tab = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 border-b-2 transition ${
      active ? "border-sky-500 text-sky-300" : "border-transparent text-slate-500 hover:text-slate-300"
    }`;
  const toggle = (on: boolean) =>
    `flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg backdrop-blur ring-1 ${
      on ? "bg-sky-600/80 ring-sky-400/60 text-white" : "bg-slate-900/85 ring-slate-700 text-slate-400"
    }`;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar connected={connected} seeding={seed.isPending} onSeed={() => seed.mutate()} />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* LEFT 40% */}
        <section className="lg:w-[40%] h-[55vh] lg:h-auto flex flex-col min-h-0 p-3 gap-3 border-r border-slate-800">
          <KpiRibbon s={stats.data} />
          <div className="flex border-b border-slate-800">
            <button className={tab(left === "incidents")} onClick={() => setLeft("incidents")}><ListOrdered size={14} /> Priority Feed ({inc.filter((i) => i.status !== "Resolved").length})</button>
            <button className={tab(left === "fleet")} onClick={() => setLeft("fleet")}><Truck size={14} /> Response Fleet ({tm.length})</button>
          </div>
          <div className="flex-1 min-h-0">
            {incidents.isError && <div className="text-sm text-red-400 p-3">Cannot reach the API at the configured host. Is the backend running on port 8000?</div>}
            {left === "incidents" ? (
              <IncidentFeed incidents={inc} now={now} selectedId={openId ?? focusId} busyId={busyId} onOpen={open} onAutoAssign={(id) => autoAssign.mutate(id)} />
            ) : (
              <FleetPanel teams={tm} incidents={inc} onToggle={(id, status) => toggleTeam.mutate({ id, status })} onDelete={(id) => removeTeam.mutate(id)} onAdd={() => { createTeam.reset(); setTeamForm(true); }} onOpenIncident={open} />
            )}
          </div>
        </section>

        {/* RIGHT 60% */}
        <section className="lg:w-[60%] flex-1 flex flex-col min-h-0">
          <div className="flex border-b border-slate-800 px-3">
            <button className={tab(right === "map")} onClick={() => setRight("map")}><MapIcon size={14} /> Live Map</button>
            <button className={tab(right === "analytics")} onClick={() => setRight("analytics")}><BarChart3 size={14} /> Analytics</button>
          </div>
          <div className="relative flex-1 min-h-[360px]">
            {right === "map" ? (
              <>
                <MapView incidents={inc} teams={tm} selectedId={focusId} showTeams={showTeams} showRoutes={showRoutes} onSelect={open} />
                <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2 items-end">
                  <button className={toggle(showTeams)} onClick={() => setShowTeams((v) => !v)}>{showTeams ? <Eye size={13} /> : <EyeOff size={13} />} Teams</button>
                  <button className={toggle(showRoutes)} onClick={() => setShowRoutes((v) => !v)}><Route size={13} /> Routes</button>
                </div>
                <div className="absolute bottom-3 left-3 z-[500] rounded-lg bg-slate-950/85 ring-1 ring-slate-700 px-3 py-2 text-[10px] text-slate-300 space-y-1">
                  <div className="flex gap-3"><span><b className="text-red-500">●</b> Critical</span><span><b className="text-orange-500">●</b> High</span><span><b className="text-yellow-500">●</b> Medium</span><span><b className="text-green-500">●</b> Low</span></div>
                  <div className="flex gap-3"><span><b className="text-green-500">▣</b> Available</span><span><b className="text-amber-500">▣</b> Busy</span><span><b className="text-slate-500">▣</b> Offline</span></div>
                </div>
              </>
            ) : (
              <AnalyticsPanel s={stats.data} />
            )}
          </div>
        </section>
      </main>

      {openId && (
        <IncidentModal
          id={openId}
          teams={tm}
          now={now}
          busy={autoAssign.isPending || assign.isPending || advance.isPending}
          onClose={() => setOpenId(null)}
          onAutoAssign={(id) => autoAssign.mutate(id)}
          onAssign={(id, teamId) => assign.mutate({ id, teamId })}
          onAdvance={(id, status) => advance.mutate({ id, status })}
          onDelete={(id) => removeIncident.mutate(id)}
        />
      )}
      {teamForm && <TeamFormModal onClose={() => setTeamForm(false)} busy={createTeam.isPending} error={createTeam.error?.message} onSubmit={(t) => createTeam.mutate(t)} />}

      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl ring-1 max-w-[90vw] ${toast.kind === "ok" ? "bg-emerald-950 text-emerald-200 ring-emerald-500/50" : "bg-red-950 text-red-200 ring-red-500/50"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
