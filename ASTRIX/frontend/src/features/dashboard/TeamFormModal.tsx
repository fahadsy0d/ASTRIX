import { useState } from "react";
import { X } from "lucide-react";
import type { Category, NewTeam } from "../../lib/types";
import { CATEGORIES, CHENNAI } from "../../lib/constants";

export default function TeamFormModal({ onClose, onSubmit, busy, error }: {
  onClose: () => void; onSubmit: (t: NewTeam) => void; busy: boolean; error?: string;
}) {
  const [f, setF] = useState({
    name: "", category: "Fire Emergency" as Category, lat: String(CHENNAI[0]), lng: String(CHENNAI[1]),
    place: "", phone: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim().length >= 2 && !isNaN(+f.lat) && !isNaN(+f.lng) && +f.lat >= -90 && +f.lat <= 90 && +f.lng >= -180 && +f.lng <= 180;
  const inp = "w-full bg-slate-950 ring-1 ring-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-sky-500";

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-slate-900 ring-1 ring-slate-700 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Register Response Team</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3 text-xs text-slate-400">
          <label className="block">Team name<input className={inp} value={f.name} onChange={set("name")} placeholder="e.g. Egmore Fire Squad Charlie" /></label>
          <label className="block">Category
            <select className={inp} value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">Latitude<input className={inp} value={f.lat} onChange={set("lat")} /></label>
            <label className="block">Longitude<input className={inp} value={f.lng} onChange={set("lng")} /></label>
          </div>
          <label className="block">Base location<input className={inp} value={f.place} onChange={set("place")} placeholder="Station / area name" /></label>
          <label className="block">Contact number<input className={inp} value={f.phone} onChange={set("phone")} placeholder="+91 …" /></label>
          {error && <div className="text-red-400 text-xs">{error}</div>}
        </div>
        <button
          disabled={!valid || busy}
          onClick={() => onSubmit({ name: f.name.trim(), category: f.category, latitude: +f.lat, longitude: +f.lng, current_location_name: f.place, contact_number: f.phone })}
          className="mt-5 w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 font-semibold text-sm"
        >
          {busy ? "Registering…" : "Register Team"}
        </button>
      </div>
    </div>
  );
}
