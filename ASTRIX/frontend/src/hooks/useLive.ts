import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WS_URL } from "../lib/api";

function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Blocked before first user gesture — ignore
  }
}

function playEscalationChime() {
  // A two-tone rising chime to signal an existing incident got worse
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
      gain.gain.setValueAtTime(0.07, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.3);
    });
  } catch {
    // ignore
  }
}

export function useLive() {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let stop = false;
    let ping: ReturnType<typeof setInterval> | undefined;

    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        ws.onopen = () => {
          setConnected(true);
          ping = setInterval(() => ws?.readyState === 1 && ws.send("ping"), 25000);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const { event: evtName, data } = payload ?? {};

            if (evtName === "incident.created" && data?.severity === "Critical") {
              playAlertChime();
            }

            if (evtName === "incident.escalated") {
              // A duplicate report upgraded an existing incident's severity
              playEscalationChime();
            }
          } catch {
            // non-JSON frame
          }
          qc.invalidateQueries({ queryKey: ["incidents"] });
          qc.invalidateQueries({ queryKey: ["incident"] });
          qc.invalidateQueries({ queryKey: ["teams"] });
          qc.invalidateQueries({ queryKey: ["stats"] });
        };

        ws.onclose = () => {
          setConnected(false);
          clearInterval(ping);
          if (!stop) setTimeout(connect, 2000);
        };
        ws.onerror = () => ws?.close();
      } catch {
        if (!stop) setTimeout(connect, 2000);
      }
    };

    connect();
    return () => {
      stop = true;
      clearInterval(ping);
      ws?.close();
    };
  }, [qc]);

  return connected;
}
