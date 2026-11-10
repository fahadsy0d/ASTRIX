import type { Incident, NewIncident, Stats, Status } from "./types";

export const HOST = (import.meta as any).env?.VITE_API ?? "http://localhost:8000";
export const WS_URL = HOST.replace(/^http/, "ws") + "/ws";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(HOST + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? r.statusText ?? "Request failed");
  }
  return r.status === 204 ? (undefined as T) : r.json();
}

export const api = {
  list: (search?: string) =>
    req<Incident[]>(`/api/v1/incidents${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  stats: () => req<Stats>("/api/v1/stats"),
  create: (b: NewIncident) =>
    req<Incident>("/api/v1/incidents", { method: "POST", body: JSON.stringify(b) }),
  setStatus: (id: number, status: Status) =>
    req<Incident>(`/api/v1/incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  dispatch: (id: number, unit: string) =>
    req<Incident>(`/api/v1/incidents/${id}/dispatch`, {
      method: "POST",
      body: JSON.stringify({ unit }),
    }),
  remove: (id: number) => req<void>(`/api/v1/incidents/${id}`, { method: "DELETE" }),
  clearAll: () => req<void>("/api/v1/incidents", { method: "DELETE" }),
  seed: (count: number = 5) =>
    req<Incident[]>(`/api/v1/incidents/seed?count=${count}`, { method: "POST" }),
  exportCsvUrl: `${HOST}/api/v1/export/incidents.csv`,
};
