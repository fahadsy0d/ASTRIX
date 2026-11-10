import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";

// Default detected Wi-Fi IP of the host machine
const DEFAULT_HOST = "http://172.20.218.135:8000";

const CATEGORIES = [
  { id: "Fire Emergency", label: "Fire", icon: "🔥", color: "#ef4444" },
  { id: "Road Accident", label: "Accident", icon: "🚗", color: "#f97316" },
  { id: "Medical Emergency", label: "Medical", icon: "🚑", color: "#ec4899" },
  { id: "Flood", label: "Flood", icon: "🌊", color: "#06b6d4" },
  { id: "Building Collapse", label: "Collapse", icon: "🏢", color: "#eab308" },
  { id: "Other Emergencies", label: "Other", icon: "⚠️", color: "#8b5cf6" },
] as const;

const QUICK_PRESETS = [
  {
    category: "Fire Emergency",
    title: "Building blaze spreading fast",
    desc: "Thick black smoke and flames on upper floor, people shouting for help",
    location: "T. Nagar, Usman Road",
    people: 4,
    coords: { lat: 13.0418, lng: 80.2341 },
  },
  {
    category: "Road Accident",
    title: "Bus & car collision",
    desc: "Severe collision at intersection, two drivers bleeding and trapped",
    location: "Adyar Signal",
    people: 2,
    coords: { lat: 13.0067, lng: 80.257 },
  },
  {
    category: "Medical Emergency",
    title: "Cardiac arrest collapse",
    desc: "Elderly person fell unconscious, difficulty breathing, urgent ambulance needed",
    location: "Anna Nagar Roundtana",
    people: 1,
    coords: { lat: 13.085, lng: 80.2101 },
  },
];

export default function App() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_HOST);
  const [tempUrl, setTempUrl] = useState(DEFAULT_HOST);
  const [showConfig, setShowConfig] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "online" | "offline">("unknown");

  const [category, setCategory] = useState("Fire Emergency");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("T. Nagar, Usman Road");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>({ lat: 13.0418, lng: 80.2341 });
  const [peopleAffected, setPeopleAffected] = useState(1);
  const [contact, setContact] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submittedIncident, setSubmittedIncident] = useState<any | null>(null);

  // Health check on mount and URL change
  useEffect(() => {
    checkHealth(serverUrl);
  }, [serverUrl]);

  const checkHealth = async (url: string) => {
    try {
      const res = await fetch(`${url}/health`, { method: "GET" });
      if (res.ok) {
        setConnectionStatus("online");
      } else {
        setConnectionStatus("offline");
      }
    } catch {
      setConnectionStatus("offline");
    }
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setCategory(preset.category);
    setTitle(preset.title);
    setDescription(preset.desc);
    setLocation(preset.location);
    setPeopleAffected(preset.people);
    setCoords(preset.coords);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !location.trim()) {
      Alert.alert("Missing Fields", "Please enter Title, Description, and Location.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        people_affected: Number(peopleAffected) || 1,
        contact: contact.trim() || null,
        source: "mobile",
        latitude: coords?.lat ?? 13.0827,
        longitude: coords?.lng ?? 80.2707,
      };

      const res = await fetch(`${serverUrl}/api/v1/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error: ${res.status}`);
      }

      const data = await res.json();
      setSubmittedIncident(data);
    } catch (err: any) {
      Alert.alert(
        "Transmission Failed",
        `Could not reach server at ${serverUrl}.\n\nEnsure your phone is on the same Wi-Fi and the backend is running with:\nuvicorn app.main:app --host 0.0.0.0 --port 8000\n\nError: ${err.message}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPeopleAffected(1);
    setContact("");
    setSubmittedIncident(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerBadge}>🚨 ASTRIX MOBILE SOS</Text>
          <Text style={styles.headerTitle}>Emergency Dispatch</Text>
        </View>

        <TouchableOpacity
          style={styles.connectionPill}
          onPress={() => {
            setTempUrl(serverUrl);
            setShowConfig(true);
          }}
        >
          <View
            style={[
              styles.statusDot,
              connectionStatus === "online"
                ? styles.dotGreen
                : connectionStatus === "offline"
                ? styles.dotRed
                : styles.dotYellow,
            ]}
          />
          <Text style={styles.connectionText}>
            {connectionStatus === "online" ? "Connected" : "Configure"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Quick SOS Presets */}
          <Text style={styles.sectionHeading}>⚡ ONE-TAP SOS SHORTCUTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
            {QUICK_PRESETS.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.presetButton}
                onPress={() => applyPreset(p)}
              >
                <Text style={styles.presetTitle}>{p.title}</Text>
                <Text style={styles.presetSub}>{p.category} · {p.location}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Emergency Category */}
          <Text style={styles.sectionHeading}>SELECT EMERGENCY CATEGORY *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const isSelected = category === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catCard,
                    isSelected && { borderColor: c.color, backgroundColor: `${c.color}22` },
                  ]}
                  onPress={() => setCategory(c.id)}
                >
                  <Text style={styles.catIcon}>{c.icon}</Text>
                  <Text
                    style={[
                      styles.catLabel,
                      isSelected && { color: "#ffffff", fontWeight: "bold" },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Incident Title */}
          <Text style={styles.label}>Incident Headline *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Major factory fire spreading to adjacent homes"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
          />

          {/* Description */}
          <Text style={styles.label}>Emergency Details & Critical Hazards *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what is happening, visible injuries, trapped individuals, explosions, or immediate assistance needed..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          {/* Location */}
          <Text style={styles.label}>Location / Landmark *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Adyar Signal, opposite bus depot"
            placeholderTextColor="#64748b"
            value={location}
            onChangeText={setLocation}
          />

          {/* Quick Chennai Locations */}
          <View style={styles.locPillsRow}>
            {[
              { name: "T. Nagar", lat: 13.0418, lng: 80.2341 },
              { name: "Adyar", lat: 13.0067, lng: 80.257 },
              { name: "Anna Nagar", lat: 13.085, lng: 80.2101 },
              { name: "Marina Beach", lat: 13.05, lng: 80.2824 },
            ].map((loc) => (
              <TouchableOpacity
                key={loc.name}
                style={styles.locPill}
                onPress={() => {
                  setLocation(`${loc.name}, Chennai`);
                  setCoords({ lat: loc.lat, lng: loc.lng });
                }}
              >
                <Text style={styles.locPillText}>📍 {loc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Casualties and Contact row */}
          <View style={styles.twoCol}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>People Affected / Casualties</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setPeopleAffected(Math.max(0, peopleAffected - 1))}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterVal}>{peopleAffected}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setPeopleAffected(peopleAffected + 1)}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Contact Phone (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98400..."
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={contact}
                onChangeText={setContact}
              />
            </View>
          </View>

          {/* SOS Submit Button */}
          <TouchableOpacity
            style={[styles.sosButton, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.sosButtonIcon}>🚨</Text>
                <Text style={styles.sosButtonText}>TRANSMIT SOS REPORT</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Direct link to Emergency Command Center Web Triage Platform.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={!!submittedIncident} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>✅</Text>
            <Text style={styles.modalTitle}>Report Transmitted!</Text>
            <Text style={styles.modalSub}>
              Incident #{submittedIncident?.id} ingested into triage hub.
            </Text>

            {/* Severity Result from Backend Engine */}
            <View style={styles.resultBox}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Assigned Severity:</Text>
                <Text
                  style={[
                    styles.resultBadge,
                    submittedIncident?.severity === "Critical"
                      ? styles.badgeCritical
                      : styles.badgeHigh,
                  ]}
                >
                  {submittedIncident?.severity?.toUpperCase()} (Score:{" "}
                  {submittedIncident?.severity_score})
                </Text>
              </View>
              <Text style={styles.reasonText}>
                {submittedIncident?.severity_reason}
              </Text>
            </View>

            <Text style={styles.statusNote}>
              Status:{" "}
              <Text style={{ color: "#38bdf8", fontWeight: "bold" }}>
                {submittedIncident?.status ?? "Reported"}
              </Text>
              {submittedIncident?.assigned_to ? (
                <Text style={{ color: "#4ade80", fontWeight: "bold" }}>
                  {"\n"}🚨 Dispatched: {submittedIncident.assigned_to}
                </Text>
              ) : (
                <Text style={{ color: "#94a3b8" }}>
                  {"\n"}Dispatcher triage queued for emergency unit assignment.
                </Text>
              )}
            </Text>

            <TouchableOpacity style={styles.modalBtn} onPress={resetForm}>
              <Text style={styles.modalBtnText}>Submit Another Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Server Config Modal */}
      <Modal visible={showConfig} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend Server Config</Text>
            <Text style={styles.modalSub}>
              Enter the IP address of your host PC running the FastAPI backend.
            </Text>

            <TextInput
              style={[styles.input, { marginVertical: 14 }]}
              value={tempUrl}
              onChangeText={setTempUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.X:8000"
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#334155", flex: 1 }]}
                onPress={() => setShowConfig(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { flex: 1 }]}
                onPress={() => {
                  setServerUrl(tempUrl.trim());
                  setShowConfig(false);
                }}
              >
                <Text style={styles.modalBtnText}>Save & Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0d1322",
  },
  headerLeft: {
    flex: 1,
  },
  headerBadge: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "bold",
  },
  connectionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotGreen: { backgroundColor: "#22c55e" },
  dotRed: { backgroundColor: "#ef4444" },
  dotYellow: { backgroundColor: "#eab308" },
  connectionText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 8,
  },
  presetRow: {
    marginBottom: 12,
  },
  presetButton: {
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  presetTitle: {
    color: "#f1f5f9",
    fontSize: 13,
    fontWeight: "bold",
  },
  presetSub: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  catCard: {
    width: "31%",
    backgroundColor: "#131b2e",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  catIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  catLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  label: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#131b2e",
    borderWidth: 1,
    borderColor: "#24324d",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#f8fafc",
    fontSize: 14,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  locPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  locPill: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  locPillText: {
    color: "#cbd5e1",
    fontSize: 11,
  },
  twoCol: {
    flexDirection: "row",
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131b2e",
    borderWidth: 1,
    borderColor: "#24324d",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 6,
  },
  counterBtn: {
    width: 34,
    height: 34,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "bold",
  },
  counterVal: {
    flex: 1,
    textAlign: "center",
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "bold",
  },
  sosButton: {
    backgroundColor: "#dc2626",
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  sosButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sosButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  footerNote: {
    color: "#64748b",
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#0d1322",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  modalIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalSub: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  resultBox: {
    width: "100%",
    backgroundColor: "#131b2e",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#24324d",
    marginBottom: 14,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  resultLabel: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
  },
  badgeCritical: {
    backgroundColor: "#ef444433",
    color: "#fca5a5",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  badgeHigh: {
    backgroundColor: "#f9731633",
    color: "#fdba74",
    borderWidth: 1,
    borderColor: "#f97316",
  },
  reasonText: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 16,
  },
  statusNote: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  modalBtn: {
    width: "100%",
    backgroundColor: "#dc2626",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
