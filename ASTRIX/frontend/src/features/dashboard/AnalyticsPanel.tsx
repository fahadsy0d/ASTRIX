import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Category, Stats } from "../../lib/types";
import { CAT_HEX, SEV, STATUSES, STATUS_HEX } from "../../lib/constants";

const tip = { contentStyle: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }, itemStyle: { color: "#e2e8f0" } };

function Kpi({ label, value, sub, c }: { label: string; value: React.ReactNode; sub?: string; c: string }) {
  return (
    <div className="rounded-xl bg-slate-900 ring-1 ring-slate-800 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${c}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPanel({ s }: { s?: Stats }) {
  if (!s) return <div className="p-8 text-slate-500 text-sm">Loading telemetry…</div>;
  const pie = Object.entries(s.by_category).map(([name, value]) => ({ name, value }));
  const ready = s.fleet_readiness_pct;
  const rc = ready >= 60 ? "#22c55e" : ready >= 30 ? "#f59e0b" : "#ef4444";

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        <Kpi label="Total Incidents" value={s.total_incidents} c="text-slate-100" />
        <Kpi label="Active Critical" value={s.active_critical} c="text-red-400" />
        <Kpi label="Available Teams" value={s.available_teams} sub={`of ${s.total_teams} registered`} c="text-emerald-400" />
        <Kpi label="Busy Teams" value={s.busy_teams} sub={s.offline_teams ? `${s.offline_teams} offline` : undefined} c="text-amber-400" />
        <Kpi label="Resolved Cases" value={s.total_resolved} c="text-sky-400" />
        <Kpi
          label="Avg Dispatch → Resolution"
          value={s.avg_dispatch_to_resolution_mins != null ? `${s.avg_dispatch_to_resolution_mins} min` : "—"}
          sub={s.avg_total_response_mins != null ? `${s.avg_total_response_mins} min report → resolved` : "no resolved cases yet"}
          c="text-violet-300"
        />
      </div>

      <div className="rounded-xl bg-slate-900 ring-1 ring-slate-800 p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold">Fleet Readiness Rate</span>
          <span className="font-bold tabular-nums" style={{ color: rc }}>{ready}%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ready}%`, background: rc, boxShadow: `0 0 10px ${rc}` }} />
        </div>
        <div className="mt-1.5 text-[10px] text-slate-500">Available ÷ total teams × 100 ({s.available_teams}/{s.total_teams})</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-900 ring-1 ring-slate-800 p-4">
          <div className="text-xs font-semibold mb-2">Incident Distribution by Category</div>
          <div className="h-64">
            {pie.length === 0 ? (
              <div className="h-full grid place-items-center text-slate-500 text-sm">No data</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" paddingAngle={3} stroke="none">
                    {pie.map((p) => <Cell key={p.name} fill={CAT_HEX[p.name as Category] ?? "#64748b"} />)}
                  </Pie>
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 ring-1 ring-slate-800 p-4">
          <div className="text-xs font-semibold mb-2">Severity Breakdown <span className="text-slate-500 font-normal">(stacked by status)</span></div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={s.severity_breakdown} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="severity" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} cursor={{ fill: "#ffffff0d" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {STATUSES.map((st) => <Bar key={st} dataKey={st} stackId="a" fill={STATUS_HEX[st]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
            {(Object.keys(SEV) as (keyof typeof SEV)[]).map((k) => <span key={k}><span style={{ color: SEV[k].hex }}>●</span> {k}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
