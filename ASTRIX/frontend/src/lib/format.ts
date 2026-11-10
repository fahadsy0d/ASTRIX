import { useEffect, useState } from "react";

export function useNow(ms = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function elapsed(iso: string, now: number, until?: string | null) {
  const end = until ? new Date(until).getTime() : now;
  const m = Math.max(0, Math.floor((end - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "short" });
