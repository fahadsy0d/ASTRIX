import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Siren,
  Trash2,
  MapPin,
  Users,
  Plus,
  Download,
  Zap,
  Search,
  Phone,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../hooks/useLive";
import {
  CATEGORIES,
  CAT_EMOJI,
  SEV,
  STATUSES,
  ALLOWED_STATUS_TRANSITIONS,
} from "../../lib/constants";
import type { Category, Incident, Status } from "../../lib/types";
import IncidentMap from "./IncidentMap";
import { Shimmer } from "./Shimmer";

const TILES = [
  { key: "total", label: "Total Reports", tone: "text-slate-100" },
  { key: "critical", label: "Critical", tone: "text-red-400" },
  { key: "reported", label: "Reported", tone: "text-sky-300" },
  { key: "pending", label: "Pending", tone: "text-yellow-300" },
  { key: "in_progress", label: "In Progress", tone: "text-blue-400" },
  { key: "resolved", label: "Resolved", tone: "text-green-400" },
] as const;

const DISPATCH_UNITS: Record<Category, { name: string; icon: string; role: string }[]> = {
  "Fire Emergency": [
    { name: "Fire Tender (Water / Foam)", icon: "🚒", role: "Fire suppression" },
    { name: "High-Rise Hydraulic Ladder", icon: "🪜", role: "Upper floor rescue" },
    { name: "Chemical Hazmat Foam Squad", icon: "☣️", role: "Toxin containment" },
  ],
  "Road Accident": [
    { name: "Trauma Ambulance (ALS)", icon: "🚑", role: "Critical paramedic" },
    { name: "Highway Police Patrol", icon: "🚓", role: "Traffic cordon" },
    { name: "Heavy Tow & Extrication Crane", icon: "🚜", role: "Wreckage removal" },
  ],
  "Medical Emergency": [
    { name: "Advanced Life Support (ALS) Ambulance", icon: "🚑", role: "Paramedic team" },
    { name: "First Responder Paramedic Bike", icon: "🏍️", role: "Rapid stabilization" },
    { name: "Mobile Critical Care Van", icon: "🚐", role: "Physician triage" },
  ],
  "Flood": [
    { name: "NDRF Motorized Inflatable Boat", icon: "🚤", role: "Water rescue" },
    { name: "High-Clearance Evacuation Truck", icon: "🚚", role: "Transport" },
    { name: "Emergency Food & Lifeline Drop", icon: "📦", role: "Supply relief" },
  ],
  "Building Collapse": [
    { name: "USAR Heavy Excavator & Crane", icon: "🏗️", role: "Debris clearance" },
    { name: "K9 Search & Scent Dogs", icon: "🐕", role: "Victim location" },
    { name: "Structural Shoring Taskforce", icon: "👷", role: "Collapse safety" },
  ],
  "Other Emergencies": [
    { name: "Rapid Response Police Squad", icon: "🚓", role: "Incident control" },
    { name: "Disaster Management Quick Team", icon: "🛡️", role: "Emergency support" },
    { name: "Civic Utility & Cable Repair Crew", icon: "🛠️", role: "Power & road clearing" },
  ],
};

export default function Dashboard() {
  useLive();
  const qc = useQueryClient();

  const [cat, setCat] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");
  const [selId, setSelId] = useState<number | null>(null);

  const inc = useQuery({
    queryKey: ["incidents"],
    queryFn: () => api.list(),
    refetchInterval: 10000,
  });

  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: api.stats,
    refetchInterval: 10000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["incidents"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) => api.setStatus(id, status),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: () => {
      setSelId(null);
      refresh();
    },
  });

  const dispatchUnit = useMutation({
    mutationFn: ({ id, unit }: { id: number; unit: string }) => api.dispatch(id, unit),
    onSuccess: refresh,
  });

  const seed = useMutation({
    mutationFn: () => api.seed(5),
    onSuccess: refresh,
  });

  const clearAll = useMutation({
    mutationFn: () => api.clearAll(),
    onSuccess: () => {
      setSelId(null);
      refresh();
    },
  });

  // Filter list by category and search text
  const list = useMemo(() => {
    let data = inc.data ?? [];
    if (cat !== "All") {
      data = data.filter((i) => i.category === cat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }
    return data;
  }, [inc.data, cat, search]);

  const selected = inc.data?.find((i) => i.id === selId);

  return (
    <div className="flex h-screen flex-col gap-3 p-3 text-slate-100">
      {/* Top Header + Global Stats */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 text-red-500 ring-1 ring-red-500/40">
            <Siren className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                Emergency Command Center
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" /> LIVE TRIAGE
              </span>
            </div>
            <p className="text-xs text-slate-400">Code Clash 2026 · Incident Response Platform</p>
          </div>
        </div>

        {/* Global Stats Tiles */}
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6 max-w-3xl">
          {TILES.map((t) =>
            stats.isLoading ? (
              <Shimmer key={t.key} className="h-13" />
            ) : (
              <div
                key={t.key}
                className={`flex flex-col justify-center rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 ${
                  t.key === "critical" && (stats.data?.critical ?? 0) > 0
                    ? "ring-1 ring-red-500/70 bg-red-950/30"
                    : ""
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                  {t.label}
                </span>
                <span className={`text-xl font-black ${t.tone}`}>
                  {stats.data?.[t.key] ?? 0}
                </span>
              </div>
            )
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Makeshift clear-all button for testing new reports */}
          <button
            onClick={() => {
              if (confirm("Clear all current reports so you can test new incoming reports?")) {
                clearAll.mutate();
              }
            }}
            disabled={clearAll.isPending}
            title="Clear all current incident reports"
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className={`h-4 w-4 ${clearAll.isPending ? "animate-pulse" : ""}`} />
            {clearAll.isPending ? "Clearing..." : "Clear Reports"}
          </button>

          {/* Quick Seed Button for Demo */}
          <button
            onClick={() => seed.mutate()}
            disabled={seed.isPending}
            title="Inject 5 simulated emergency reports into live feed"
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-50"
          >
            <Zap className={`h-4 w-4 ${seed.isPending ? "animate-spin" : ""}`} />
            {seed.isPending ? "Seeding..." : "⚡ Seed Feed"}
          </button>

          {/* Export CSV (Round 2 Plugin proof) */}
          <a
            href={api.exportCsvUrl}
            download="incidents_export.csv"
            title="Download full incident triage CSV log"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            CSV
          </a>

          {/* Citizen Report Entry */}
          <a
            href="/report"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-red-900/40 transition hover:bg-red-500"
          >
            <Plus className="h-4 w-4" />
            Report
          </a>
        </div>
      </header>

      {/* Main Split Interface */}
      <main className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.35fr_1fr]">
        {/* Left: Map View */}
        <section className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-inner">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 shadow backdrop-blur border border-slate-800">
            <MapPin className="h-3.5 w-3.5 text-red-400" />
            Chennai Triage GIS Map
            <span className="text-[10px] text-slate-500">
              ({list.filter((i) => i.latitude && i.longitude && i.status !== "Resolved").length} active markers)
            </span>
          </div>

          {inc.isLoading ? (
            <Shimmer className="h-full w-full" />
          ) : (
            <IncidentMap incidents={inc.data ?? []} selected={selected} onSelect={setSelId} />
          )}
        </section>

        {/* Right: Incident List & Detail Panel */}
        <section className="flex min-h-0 flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow-lg backdrop-blur">
          {/* Search bar & Category filters */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search incidents by location, title, keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-red-500/80"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2 text-xs text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(["All", ...CATEGORIES] as const).map((c) => {
                const count = c === "All" ? stats.data?.total ?? 0 : stats.data?.by_category[c] ?? 0;
                return (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                      cat === c
                        ? "bg-slate-100 text-slate-900 ring-1 ring-slate-100 font-semibold"
                        : "bg-slate-800/80 text-slate-300 ring-1 ring-slate-700/60 hover:bg-slate-700"
                    }`}
                  >
                    {c === "All" ? "All" : `${CAT_EMOJI[c]} ${c.split(" ")[0]}`}
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Incident Feed List */}
          <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
            {inc.isLoading &&
              Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-18" />)}

            {!inc.isLoading && list.length === 0 && (
              <li className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <ShieldAlert className="h-10 w-10 stroke-1 text-slate-600 mb-2" />
                <p className="text-sm">No incidents match this filter.</p>
                <p className="text-xs text-slate-600 mt-1">
                  Click "⚡ Seed Feed" or report a new incident.
                </p>
              </li>
            )}

            {list.map((i) => {
              const isSelected = i.id === selId;
              const isCriticalActive = i.severity === "Critical" && i.status !== "Resolved";

              return (
                <li
                  key={i.id}
                  onClick={() => setSelId(i.id)}
                  className={`cursor-pointer rounded-xl border-l-4 bg-slate-800/60 p-3 transition hover:bg-slate-800 ${
                    SEV[i.severity].bar
                  } ${
                    isSelected
                      ? "ring-2 ring-slate-300 bg-slate-800"
                      : "border border-slate-800/80"
                  } ${isCriticalActive ? "bg-red-950/30 ring-1 ring-red-500/50" : ""} ${
                    i.status === "Resolved" ? "opacity-55" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate font-semibold text-slate-200 text-sm">
                        <span>{CAT_EMOJI[i.category]}</span>
                        <span className="truncate">{i.title}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-slate-500" />
                          {i.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-500" />
                          {i.people_affected} affected
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {new Date(i.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {i.assigned_to && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Unit Dispatched:</span>
                          <span className="text-emerald-300 truncate">{i.assigned_to}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1 ${
                          SEV[i.severity].chip
                        } ${isCriticalActive ? "animate-pulse" : ""}`}
                      >
                        {i.severity}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">{i.status}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Selected Incident Inspector Drawer */}
          {selected && (
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3.5 shadow-xl text-xs">
              <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-sm">
                    #{selected.id} · {selected.category}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${
                      SEV[selected.severity].chip
                    }`}
                  >
                    Score: {selected.severity_score}
                  </span>
                </div>
                <button
                  onClick={() => setSelId(null)}
                  className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>

              <p className="mb-2 text-slate-300 leading-relaxed text-xs">
                {selected.description}
              </p>

              {/* Explainable Severity Reasoning */}
              <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Explainable Severity Rationale:
                </span>
                <div className="flex flex-wrap gap-1">
                  {selected.severity_reason.split("; ").map((reason, idx) => (
                    <span
                      key={idx}
                      className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[11px] text-slate-300 border border-slate-700/60"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {/* Location & Contact Meta */}
              <div className="mb-3 flex flex-wrap gap-3 text-slate-400 text-xs">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {selected.location}
                </span>
                {selected.contact && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    {selected.contact}
                  </span>
                )}
                <span className="text-slate-500">Source: {selected.source}</span>

                {/* Corroboration badge */}
                {selected.report_count > 1 && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-300 ring-1 ring-orange-500/40">
                    ⚠ {selected.report_count} reporters confirmed this incident
                  </span>
                )}
              </div>

              {/* Category-Specific Dispatch Unit Actions */}
              <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    ⚡ Dispatch Emergency Unit:
                  </span>
                  {selected.assigned_to ? (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                      ✓ Unit En Route: {selected.assigned_to}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">No unit assigned yet</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(DISPATCH_UNITS[selected.category] ?? []).map((u) => {
                    const isAssigned = selected.assigned_to === u.name;
                    return (
                      <button
                        key={u.name}
                        disabled={dispatchUnit.isPending || isAssigned}
                        onClick={() => dispatchUnit.mutate({ id: selected.id, unit: u.name })}
                        className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                          isAssigned
                            ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/60 shadow-sm"
                            : "bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{u.icon}</span>
                          <span className="truncate">{u.name}</span>
                        </span>
                        <span className="text-[10px] ml-1 shrink-0 text-slate-400">
                          {isAssigned ? "Active" : "Send ➔"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Transition Controls (Safe Disabling) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 mr-1">Status:</span>
                  {STATUSES.map((s) => {
                    const isCurrent = selected.status === s;
                    const isAllowed = ALLOWED_STATUS_TRANSITIONS[selected.status]?.includes(s);
                    const disabled = setStatus.isPending || (!isCurrent && !isAllowed);

                    return (
                      <button
                        key={s}
                        disabled={disabled}
                        onClick={() => setStatus.mutate({ id: selected.id, status: s })}
                        title={
                          isCurrent
                            ? "Current status"
                            : isAllowed
                            ? `Transition to ${s}`
                            : `Disallowed from ${selected.status}`
                        }
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          isCurrent
                            ? "bg-blue-600 text-white shadow-sm"
                            : isAllowed
                            ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                            : "bg-slate-900 text-slate-600 cursor-not-allowed opacity-40"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>

                {/* Delete Duplicate / Test Report */}
                <button
                  onClick={() => {
                    if (confirm(`Delete test/duplicate report #${selected.id}?`)) {
                      remove.mutate(selected.id);
                    }
                  }}
                  disabled={remove.isPending}
                  className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-900/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>

              {setStatus.isError && (
                <p className="mt-2 text-xs text-red-400">{(setStatus.error as Error).message}</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
