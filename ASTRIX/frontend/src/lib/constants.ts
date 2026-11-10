import type { Category, Severity, Status, TeamStatus } from "./types";

export const SEV: Record<Severity, { hex: string; chip: string; bar: string }> = {
  Critical: { hex: "#ef4444", chip: "bg-red-500/20 text-red-300 ring-red-500/50", bar: "border-l-red-500" },
  High: { hex: "#f97316", chip: "bg-orange-500/20 text-orange-300 ring-orange-500/50", bar: "border-l-orange-500" },
  Medium: { hex: "#eab308", chip: "bg-yellow-500/20 text-yellow-300 ring-yellow-500/50", bar: "border-l-yellow-500" },
  Low: { hex: "#22c55e", chip: "bg-green-500/20 text-green-300 ring-green-500/50", bar: "border-l-green-500" },
};

export const CATEGORIES: Category[] = [
  "Fire Emergency", "Road Accident", "Medical Emergency", "Flood", "Building Collapse", "Other Emergencies",
];

export const CAT_EMOJI: Record<Category, string> = {
  "Fire Emergency": "🔥", "Road Accident": "🚗", "Medical Emergency": "🚑",
  Flood: "🌊", "Building Collapse": "🏢", "Other Emergencies": "⚠️",
};

/** Vehicle icon per team category: fire truck, ambulance, rescue boat... */
export const VEHICLE: Record<Category, string> = {
  "Fire Emergency": "🚒", "Medical Emergency": "🚑", "Flood": "🚤",
  "Road Accident": "🚓", "Building Collapse": "🏗️", "Other Emergencies": "🛟",
};

export const CAT_HEX: Record<Category, string> = {
  "Fire Emergency": "#f97316", "Road Accident": "#38bdf8", "Medical Emergency": "#f43f5e",
  Flood: "#3b82f6", "Building Collapse": "#a78bfa", "Other Emergencies": "#94a3b8",
};

export const STATUSES: Status[] = ["Reported", "Assigned", "In Progress", "Resolved"];
export const STATUS_HEX: Record<Status, string> = {
  Reported: "#94a3b8", Assigned: "#38bdf8", "In Progress": "#f59e0b", Resolved: "#22c55e",
};
export const NEXT_STATUS: Record<Status, Status | null> = {
  Reported: "Assigned", Assigned: "In Progress", "In Progress": "Resolved", Resolved: null,
};

export const TEAM_HEX: Record<TeamStatus, string> = { Available: "#22c55e", Busy: "#f59e0b", Offline: "#64748b" };

export const CHENNAI: [number, number] = [13.0427, 80.2300];
