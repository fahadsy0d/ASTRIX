import type {
  AssignmentResult, Incident, IncidentDetail, NewIncident, NewTeam, Stats, Status, Team, TeamStatus,
} from "./types";

export const HOST = (import.meta as any).env?.VITE_API ?? "http://localhost:8000";
export const WS_URL = HOST.replace(/^http/, "ws") + "/ws";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(HOST + path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const d = err.detail;
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? d.map((x: any) => x.msg).join("; ") : r.statusText || "Request failed");
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
const post = <T>(p: string, body?: unknown) => req<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const api = {
  incidents: () => req<Incident[]>("/api/v1/incidents"),
  incident: (id: string) => req<IncidentDetail>(`/api/v1/incidents/${id}`),
  create: (b: NewIncident) => post<Incident>("/api/v1/incidents", b),
  setStatus: (id: string, status: Status) =>
    req<Incident>(`/api/v1/incidents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  autoAssign: (id: string) => post<AssignmentResult>(`/api/v1/incidents/${id}/auto-assign`),
  assign: (id: string, team_id: string) => post<AssignmentResult>(`/api/v1/incidents/${id}/assign`, { team_id }),
  remove: (id: string) => req<void>(`/api/v1/incidents/${id}`, { method: "DELETE" }),
  teams: () => req<Team[]>("/api/v1/teams"),
  createTeam: (b: NewTeam) => post<Team>("/api/v1/teams", b),
  setTeamStatus: (id: string, status: TeamStatus) =>
    req<Team>(`/api/v1/teams/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  removeTeam: (id: string) => req<void>(`/api/v1/teams/${id}`, { method: "DELETE" }),
  stats: () => req<Stats>("/api/v1/analytics/stats"),
  seed: () => post<{ status: string }>("/api/v1/seed"),
  exportCsvUrl: `${HOST}/api/v1/export/incidents.csv`,
};
