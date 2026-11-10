import { AlertTriangle, ListChecks, Truck, Wrench } from "lucide-react";
import type { Stats } from "../../lib/types";

export default function KpiRibbon({ s }: { s?: Stats }) {
  const items = [
    { label: "Total", v: s?.total_incidents, icon: ListChecks, c: "text-slate-200" },
    { label: "Critical", v: s?.active_critical, icon: AlertTriangle, c: "text-red-400" },
    { label: "Teams Free", v: s?.available_teams, icon: Truck, c: "text-emerald-400" },
    { label: "Teams Busy", v: s?.busy_teams, icon: Wrench, c: "text-amber-400" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ label, v, icon: Icon, c }) => (
        <div key={label} className="rounded-xl bg-slate-900 ring-1 ring-slate-800 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500">
            {label} <Icon size={12} className={c} />
          </div>
          <div className={`text-xl font-bold tabular-nums ${c}`}>{v ?? "–"}</div>
        </div>
      ))}
    </div>
  );
}
