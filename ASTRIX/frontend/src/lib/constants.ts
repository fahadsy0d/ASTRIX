import type { Category, Severity, Status } from "./types";

export const SEV: Record<Severity, { hex: string; chip: string; bar: string }> = {
  Critical: {
    hex: "#ef4444",
    chip: "bg-red-500/20 text-red-300 ring-red-500/50",
    bar: "border-l-red-500",
  },
  High: {
    hex: "#f97316",
    chip: "bg-orange-500/20 text-orange-300 ring-orange-500/50",
    bar: "border-l-orange-500",
  },
  Medium: {
    hex: "#eab308",
    chip: "bg-yellow-500/20 text-yellow-300 ring-yellow-500/50",
    bar: "border-l-yellow-500",
  },
  Low: {
    hex: "#22c55e",
    chip: "bg-green-500/20 text-green-300 ring-green-500/50",
    bar: "border-l-green-500",
  },
};

export const CATEGORIES: Category[] = [
  "Fire Emergency",
  "Road Accident",
  "Medical Emergency",
  "Flood",
  "Building Collapse",
  "Other Emergencies",
];

export const CAT_EMOJI: Record<Category, string> = {
  "Fire Emergency": "🔥",
  "Road Accident": "🚗",
  "Medical Emergency": "🚑",
  "Flood": "🌊",
  "Building Collapse": "🏢",
  "Other Emergencies": "⚠️",
};

export const STATUSES: Status[] = ["Reported", "Pending", "In Progress", "Resolved"];

export const ALLOWED_STATUS_TRANSITIONS: Record<Status, Status[]> = {
  Reported: ["Pending", "In Progress", "Resolved"],
  Pending: ["In Progress", "Resolved"],
  "In Progress": ["Resolved", "Pending"],
  Resolved: ["In Progress"],
};

export const CHENNAI: [number, number] = [13.0827, 80.2707];
