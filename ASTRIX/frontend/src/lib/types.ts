export type Severity = "Low" | "Medium" | "High" | "Critical";

export type Status = "Reported" | "Pending" | "In Progress" | "Resolved";

export type Category =
  | "Fire Emergency"
  | "Road Accident"
  | "Medical Emergency"
  | "Flood"
  | "Building Collapse"
  | "Other Emergencies";

export interface Incident {
  id: number;
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
  status: Status;
  source: string;
  assigned_to: string | null;
  report_count: number;      // how many separate reporters submitted this same incident
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total: number;
  critical: number;
  reported: number;
  pending: number;
  in_progress: number;
  resolved: number;
  by_category: Record<string, number>;
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
