import { useEffect, useRef, useState } from "react";
import { Mic, FileText, CheckCircle2, MapPin, ArrowLeft, AlertCircle, Phone, Users } from "lucide-react";
import { api } from "../../lib/api";
import { CATEGORIES, CAT_EMOJI } from "../../lib/constants";
import type { Category } from "../../lib/types";

const guessCategory = (text: string): Category => {
  const s = text.toLowerCase();
  if (/fire|smoke|burn|flame|blaze|explosion/.test(s)) return "Fire Emergency";
  if (/accident|crash|collision|vehicle|bike|car|bus|truck|lorry|hit/.test(s)) return "Road Accident";
  if (/heart|breath|unconscious|bleed|injur|ambulance|faint|pain|patient|choking/.test(s))
    return "Medical Emergency";
  if (/flood|water|rain|drown|submerged|overflow/.test(s)) return "Flood";
  if (/collapse|building|wall|roof|ceiling|rubble|debris|crumbled/.test(s))
    return "Building Collapse";
  return "Other Emergencies";
};

export default function ReportPage() {
  const [mode, setMode] = useState<"choose" | "form" | "done">("choose");
  const [listening, setListening] = useState(false);
  const [f, setF] = useState({
    title: "",
    description: "",
    category: "Other Emergencies" as Category,
    location: "",
    people_affected: 1,
    contact: "",
  });
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [source, setSource] = useState("web");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const recRef = useRef<any>(null);

  // Attempt automatic GPS capture on page load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setF((prev) => ({
            ...prev,
            location: prev.location || `GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          }));
        },
        () => {
          // GPS denied or unavailable
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErr("Web Speech API is not supported in this browser. Please use the emergency form.");
      setMode("form");
      return;
    }

    try {
      const recognizer = new SpeechRecognition();
      recognizer.lang = "en-IN";
      recognizer.interimResults = true;
      recognizer.continuous = false;

      recognizer.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((x: any) => x[0].transcript)
          .join(" ");

        const guessed = guessCategory(transcript);
        const titleWords = transcript.trim().split(" ");
        const title =
          titleWords.length > 8 ? titleWords.slice(0, 8).join(" ") + "..." : transcript;

        setF((prev) => ({
          ...prev,
          description: transcript,
          title: title || prev.title,
          category: guessed,
        }));
      };

      recognizer.onend = () => {
        setListening(false);
        setSource("voice");
        setMode("form");
      };

      recognizer.onerror = (event: any) => {
        setListening(false);
        if (event.error !== "no-speech") {
          setErr(`Microphone capture error (${event.error}). Switched to form.`);
        }
        setMode("form");
      };

      recRef.current = recognizer;
      setListening(true);
      setErr("");
      recognizer.start();
    } catch (e) {
      setListening(false);
      setMode("form");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!f.title.trim() || !f.description.trim() || !f.location.trim()) {
      setErr("Please complete the Title, Description, and Location fields.");
      return;
    }

    setSubmitting(true);
    try {
      await api.create({
        title: f.title.trim(),
        description: f.description.trim(),
        category: f.category,
        location: f.location.trim(),
        people_affected: Number(f.people_affected) || 1,
        contact: f.contact.trim() || null,
        source,
        latitude: geo?.lat ?? null,
        longitude: geo?.lng ?? null,
      });
      setMode("done");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle =
    "w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-3 text-sm text-slate-100 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-4 text-slate-100">
      {/* Top Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Command Center
        </a>
        <span className="text-xs font-semibold text-red-400 tracking-wider uppercase">
          SOS Emergency Portal
        </span>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
        {mode === "choose" && (
          <div className="flex flex-col gap-5 text-center">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Report an Emergency</h1>
              <p className="mt-1 text-xs text-slate-400">
                Choose hands-free Voice SOS or standard emergency form
              </p>
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-400 ring-1 ring-red-500/30">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {err}
              </div>
            )}

            {/* Voice Big Button */}
            <button
              onClick={startVoice}
              className={`flex h-44 flex-col items-center justify-center gap-3 rounded-3xl bg-red-600 text-xl font-bold shadow-xl shadow-red-950/60 transition active:scale-95 ${
                listening ? "animate-pulse bg-red-700 ring-4 ring-red-500/50" : "hover:bg-red-500"
              }`}
            >
              <Mic className={`h-12 w-12 ${listening ? "animate-bounce" : ""}`} />
              <span>{listening ? "Listening... Speak now" : "Tap & Speak SOS"}</span>
              <span className="text-[11px] font-normal opacity-80">
                Voice AI extracts incident & severity
              </span>
            </button>

            <div className="relative flex items-center justify-center">
              <span className="absolute bg-slate-900 px-3 text-xs text-slate-500">OR</span>
              <div className="w-full border-t border-slate-800" />
            </div>

            {/* Manual Form Button */}
            <button
              onClick={() => {
                setSource("web");
                setMode("form");
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 py-3.5 text-sm font-semibold hover:bg-slate-800 transition"
            >
              <FileText className="h-4 w-4" />
              Fill Structured Form Instead
            </button>
          </div>
        )}

        {mode === "form" && (
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {source === "voice" ? "🎙️ Review Transcribed Report" : "📝 Emergency Details"}
                </h2>
                <p className="text-xs text-slate-400">
                  {source === "voice"
                    ? "Verify what we captured before transmitting to dispatchers"
                    : "Provide incident details for immediate priority dispatch"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="text-xs text-slate-400 hover:text-white"
              >
                Change mode
              </button>
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-2.5 text-xs text-red-400 ring-1 ring-red-500/30">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {err}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Incident Title *</label>
              <input
                className={inputStyle}
                placeholder="e.g. Chemical store fire with trapped workers"
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Incident Description *
              </label>
              <textarea
                className={inputStyle}
                rows={3}
                placeholder="Describe what happened, any casualties, hazards, or immediate threats..."
                value={f.description}
                onChange={(e) => setF({ ...f, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Category *</label>
                <select
                  className={inputStyle}
                  value={f.category}
                  onChange={(e) => setF({ ...f, category: e.target.value as Category })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-slate-100">
                      {CAT_EMOJI[c]} {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  People Affected / Casualties *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="number"
                    min={0}
                    className={`${inputStyle} pl-9`}
                    value={f.people_affected}
                    onChange={(e) => setF({ ...f, people_affected: Number(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Incident Location / Landmark *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  className={`${inputStyle} pl-9`}
                  placeholder="Street name, landmark, intersection..."
                  value={f.location}
                  onChange={(e) => setF({ ...f, location: e.target.value })}
                  required
                />
              </div>
              {geo && (
                <span className="mt-1 block text-[10px] text-emerald-400">
                  ✓ GPS coordinates tagged: {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                </span>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Contact Information (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  className={`${inputStyle} pl-9`}
                  placeholder="Phone number or reporter name"
                  value={f.contact}
                  onChange={(e) => setF({ ...f, contact: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex items-center justify-center rounded-2xl bg-red-600 py-3.5 text-base font-bold text-white shadow-lg shadow-red-950/60 transition hover:bg-red-500 disabled:opacity-50"
            >
              {submitting ? "Transmitting SOS..." : "🚨 Transmit Emergency Report"}
            </button>
          </form>
        )}

        {mode === "done" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-500/30">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Emergency Report Ingested</h2>
              <p className="mt-1 text-xs text-slate-400 max-w-xs">
                Your report has been received and scored by the triage engine. First responders in
                your quadrant have been notified.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full">
              <button
                onClick={() => {
                  setF({
                    title: "",
                    description: "",
                    category: "Other Emergencies",
                    location: "",
                    people_affected: 1,
                    contact: "",
                  });
                  setMode("choose");
                }}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold hover:bg-slate-800 transition"
              >
                Submit Another Report
              </button>
              <a
                href="/"
                className="flex-1 rounded-xl bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Open Live Dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
