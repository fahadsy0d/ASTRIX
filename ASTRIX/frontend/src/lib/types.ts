export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Status = "Reported" | "Assigned" | "In Progress" | "Resolved";
export type TeamStatus = "Available" | "Busy" | "Offline";
export type Category =
  | "Fire Emergency"
  | "Road Accident"
  | "Medical Emergency"
  | "Flood"
  | "Building Collapse"
  | "Other Emergencies";

export interface Team {
  id: string;
  name: string;
  category: Category;
  latitude: number;
  longitude: number;
  current_location_name: string;
  status: TeamStatus;
  contact_number: string;
  assigned_incident_id: string | null;
  created_at: string;
  updated_at: string;
  distance_km?: number | null;
}

export interface PriorityComponent {
  key: string;
  label: string;
  points: number;
  max: number;
}
export interface PriorityBreakdown {
  total: number;
  components: PriorityComponent[];
  summary: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: Category;
  location: string;
  latitude: number | null;
  longitude: number | null;
  people_affected: number;
  contact: string | null;
  severity: Severity;
  severity_score: number;
  severity_reason: string;
  priority_score: number;
  priority_breakdown: PriorityBreakdown | null;
  status: Status;
  source: string;
  report_count: number;
  assigned_team_id: string | null;
  assigned_team: Team | null;
  distance_km: number | null;
  eta_minutes: number | null;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
  response_time_mins: number | null;
}

export interface HistoryEntry {
  id: number;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  note: string | null;
  timestamp: string;
}
export interface IncidentDetail extends Incident {
  history: HistoryEntry[];
}

export interface Stats {
  total_incidents: number;
  active_critical: number;
  available_teams: number;
  busy_teams: number;
  offline_teams: number;
  total_teams: number;
  total_resolved: number;
  avg_dispatch_to_resolution_mins: number | null;
  avg_total_response_mins: number | null;
  fleet_readiness_pct: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  severity_breakdown: ({ severity: Severity } & Record<Status, number>)[];
}

export interface AssignmentResult {
  incident: Incident;
  team: Team;
  distance_km: number;
  eta_minutes: number;
}

export type NewIncident = Pick<
  Incident,
  "title" | "description" | "category" | "location" | "people_affected"
> & {
  latitude?: number | null;
  longitude?: number | null;
  contact?: string | null;
  source?: string;
};

export type NewTeam = {
  name: string;
  category: Category;
  latitude: number;
  longitude: number;
  current_location_name?: string;
  contact_number?: string;
  id?: string;
};
