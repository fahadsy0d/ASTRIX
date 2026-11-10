import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Incident, Team } from "../../lib/types";
import { CHENNAI, SEV, TEAM_HEX, VEHICLE } from "../../lib/constants";

const incidentIcon = (sev: Incident["severity"], selected: boolean) =>
  L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div class="astrix-pin ${selected ? "sel" : ""}" style="--c:${SEV[sev].hex}"><span class="ring"></span><span class="core"></span></div>`,
  });

const teamIcon = (t: Team) =>
  L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div class="astrix-team ${t.status === "Offline" ? "off" : ""}" style="--c:${TEAM_HEX[t.status]}">${VEHICLE[t.category]}</div>`,
  });

function FlyTo({ target }: { target?: Incident }) {
  const map = useMap();
  useEffect(() => {
    if (target?.latitude != null && target.longitude != null) {
      map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 13), { duration: 0.7 });
    }
  }, [target?.id, target?.latitude, target?.longitude, map]);
  return null;
}

export default function MapView({
  incidents, teams, selectedId, showTeams, showRoutes, onSelect,
}: {
  incidents: Incident[];
  teams: Team[];
  selectedId?: string | null;
  showTeams: boolean;
  showRoutes: boolean;
  onSelect: (id: string) => void;
}) {
  const visible = incidents.filter((i) => i.latitude != null && i.longitude != null && i.status !== "Resolved");
  const routes = visible.filter((i) => i.assigned_team);
  const selected = incidents.find((i) => i.id === selectedId);

  return (
    <MapContainer center={CHENNAI} zoom={11} scrollWheelZoom className="h-full w-full z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyTo target={selected} />

      {showRoutes &&
        routes.map((i) => {
          const t = i.assigned_team!;
          const pts: [number, number][] = [[t.latitude, t.longitude], [i.latitude!, i.longitude!]];
          return (
            <span key={`route-${i.id}`}>
              <Polyline positions={pts} pathOptions={{ color: "#38bdf8", weight: 10, opacity: 0.18 }} />
              <Polyline positions={pts} pathOptions={{ color: "#7dd3fc", weight: 3, dashArray: "8 8", className: "route-flow" }}>
                <Popup>
                  <div className="text-xs min-w-[170px]">
                    <div className="font-bold">{t.id} → {i.title}</div>
                    <div className="mt-1">Distance: <b>{i.distance_km ?? "—"} km</b></div>
                    <div>ETA: <b>{i.eta_minutes ?? "—"} min</b> @ 40 km/h</div>
                  </div>
                </Popup>
              </Polyline>
            </span>
          );
        })}

      {showTeams &&
        teams.map((t) => (
          <Marker key={t.id} position={[t.latitude, t.longitude]} icon={teamIcon(t)} zIndexOffset={500}>
            <Popup>
              <div className="text-xs min-w-[170px]">
                <div className="font-bold">{VEHICLE[t.category]} {t.name}</div>
                <div className="text-slate-500">{t.id} · {t.category}</div>
                <div className="mt-1">Status: <b style={{ color: TEAM_HEX[t.status] }}>{t.status}</b></div>
                <div>{t.current_location_name}</div>
                {t.contact_number && <div>📞 {t.contact_number}</div>}
              </div>
            </Popup>
          </Marker>
        ))}

      {visible.map((i) => (
        <Marker
          key={i.id}
          position={[i.latitude!, i.longitude!]}
          icon={incidentIcon(i.severity, i.id === selectedId)}
          zIndexOffset={i.severity === "Critical" ? 1000 : 800}
          eventHandlers={{ click: () => onSelect(i.id) }}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            <div className="text-xs">
              <b>{i.title}</b>
              <br />
              <span style={{ color: SEV[i.severity].hex }}>● {i.severity}</span> · P{i.priority_score} · {i.status}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
