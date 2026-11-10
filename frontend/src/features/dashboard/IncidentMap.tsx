import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { Incident } from "../../lib/types";
import { CHENNAI, SEV } from "../../lib/constants";

function FlyTo({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], 14, { duration: 0.8 });
    }
  }, [lat, lng, map]);
  return null;
}

/** Haversine distance in metres between two GPS points */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Groups incidents within CLUSTER_RADIUS metres of each other into a single visual cluster */
const CLUSTER_RADIUS_M = 200;

interface Cluster {
  id: string;             // anchor incident id used as React key
  centLat: number;
  centLng: number;
  incidents: Incident[];
  worstSeverity: Incident["severity"];
  totalReporters: number;
  hasSelected: boolean;
}

function buildClusters(incidents: Incident[], selectedId?: number): Cluster[] {
  const active = incidents.filter(
    (i) => i.latitude != null && i.longitude != null && i.status !== "Resolved"
  );

  const assigned = new Set<number>();
  const clusters: Cluster[] = [];

  for (const anchor of active) {
    if (assigned.has(anchor.id)) continue;

    const group: Incident[] = [anchor];
    assigned.add(anchor.id);

    for (const other of active) {
      if (assigned.has(other.id)) continue;
      const dist = haversineM(anchor.latitude!, anchor.longitude!, other.latitude!, other.longitude!);
      if (dist <= CLUSTER_RADIUS_M) {
        group.push(other);
        assigned.add(other.id);
      }
    }

    // Centroid = average of all coordinates in this cluster
    const centLat = group.reduce((s, i) => s + i.latitude!, 0) / group.length;
    const centLng = group.reduce((s, i) => s + i.longitude!, 0) / group.length;

    // Worst severity in cluster determines badge colour
    const sevRank: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };
    const worstSeverity = group.reduce((worst, i) =>
      (sevRank[i.severity] ?? 0) > (sevRank[worst] ?? 0) ? i.severity : worst,
      group[0].severity
    );

    const totalReporters = group.reduce((s, i) => s + (i.report_count ?? 1), 0);
    const hasSelected = group.some((i) => i.id === selectedId);

    clusters.push({
      id: String(anchor.id),
      centLat,
      centLng,
      incidents: group,
      worstSeverity,
      totalReporters,
      hasSelected,
    });
  }

  return clusters;
}

export default function IncidentMap({
  incidents,
  selected,
  onSelect,
}: {
  incidents: Incident[];
  selected?: Incident;
  onSelect: (id: number) => void;
}) {
  const clusters = useMemo(
    () => buildClusters(incidents, selected?.id),
    [incidents, selected?.id]
  );

  return (
    <MapContainer
      center={CHENNAI}
      zoom={11}
      scrollWheelZoom={true}
      className="h-full w-full rounded-2xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo lat={selected?.latitude} lng={selected?.longitude} />

      {clusters.map((cluster) => {
        const isMulti = cluster.incidents.length > 1;
        const isCritical = cluster.worstSeverity === "Critical";
        const isSelected = cluster.hasSelected;
        const hex = SEV[cluster.worstSeverity].hex;

        // Radius scales with cluster size + selected state
        const baseRadius = isCritical ? 11 : 8;
        const clusterBonus = isMulti ? Math.min(cluster.incidents.length * 2, 10) : 0;
        const radius = isSelected ? baseRadius + clusterBonus + 6 : baseRadius + clusterBonus;

        return (
          <CircleMarker
            key={cluster.id}
            center={[cluster.centLat, cluster.centLng]}
            radius={radius}
            pathOptions={{
              color: hex,
              fillColor: hex,
              fillOpacity: isMulti ? 0.75 : 0.6,
              weight: isSelected ? 4 : isMulti ? 3 : 2,
              className: isCritical ? "pulse-critical" : "",
            }}
            eventHandlers={{
              click: () => onSelect(cluster.incidents[0].id),
            }}
          >
            <Tooltip direction="top" offset={[0, -5]}>
              <div className="text-xs font-sans min-w-[160px]">
                {isMulti ? (
                  <>
                    <div className="font-bold mb-1" style={{ color: hex }}>
                      📍 {cluster.incidents.length} Incidents at this location
                    </div>
                    <div className="text-slate-500 text-[10px] mb-1">
                      {cluster.totalReporters} reporters · Worst: {cluster.worstSeverity}
                    </div>
                    {cluster.incidents.map((i) => (
                      <div key={i.id} className="text-[11px] text-slate-700 leading-tight truncate">
                        • {i.title}
                        {i.report_count > 1 && (
                          <span className="text-orange-500 ml-1">×{i.report_count}</span>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <strong>{cluster.incidents[0].title}</strong>
                    <br />
                    <span style={{ color: hex }}>● {cluster.worstSeverity}</span>
                    {" · "}
                    {cluster.incidents[0].category}
                    {cluster.totalReporters > 1 && (
                      <div className="text-orange-500 text-[10px] mt-0.5">
                        ⚠ {cluster.totalReporters} reporters confirmed this
                      </div>
                    )}
                  </>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
