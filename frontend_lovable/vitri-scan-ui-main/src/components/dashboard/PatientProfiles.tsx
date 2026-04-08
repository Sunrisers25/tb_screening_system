import { useState, useEffect } from "react";
import {
  Users, Search, Plus, X, Phone, Mail, FileText,
  Activity, ChevronRight, AlertTriangle, CheckCircle2, Calendar, User, Stethoscope, Columns
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Patient {
  id: number;
  name: string;
  age?: number;
  gender?: string;
  contact_phone?: string;
  contact_email?: string;
  medical_history?: string;
  symptoms?: string[];
  created_at: string;
  updated_at: string;
  last_screening?: { risk: string; probability: number; timestamp: string } | null;
  screening_count: number;
}

interface Screening {
  id: number;
  filename: string;
  risk?: string;
  result?: string;
  probability: number;
  timestamp: string;
  notes?: string;
  original_path?: string;
  heatmap_path?: string;
}

const SYMPTOM_OPTIONS = [
  "Persistent cough (>2 weeks)",
  "Coughing blood (Hemoptysis)",
  "Fever",
  "Night sweats",
  "Unexplained weight loss",
  "Fatigue / Weakness",
  "Chest pain",
  "Shortness of breath",
  "Loss of appetite",
];

const PatientProfiles = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<(Patient & { screenings?: Screening[] }) | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formHistory, setFormHistory] = useState("");
  const [formSymptoms, setFormSymptoms] = useState<string[]>([]);
  const [formOtherSymptom, setFormOtherSymptom] = useState("");

  const fetchPatients = async () => {
    try {
      const url = searchQuery
        ? `http://localhost:5000/api/patients?search=${encodeURIComponent(searchQuery)}`
        : "http://localhost:5000/api/patients";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error("Failed to fetch patients", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery]);

  const fetchPatientDetail = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/patients/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPatient(data);
      }
    } catch (error) {
      console.error("Failed to fetch patient detail", error);
    }
  };

  const handleAddPatient = async () => {
    if (!formName.trim()) {
      alert("Patient name is required");
      return;
    }

    const allSymptoms = [...formSymptoms];
    if (formOtherSymptom.trim()) {
      allSymptoms.push(formOtherSymptom.trim());
    }

    try {
      const response = await fetch("http://localhost:5000/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          age: formAge ? parseInt(formAge) : null,
          gender: formGender || null,
          contact_phone: formPhone || null,
          contact_email: formEmail || null,
          medical_history: formHistory || null,
          symptoms: allSymptoms.length > 0 ? allSymptoms : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        resetForm();
        setShowAddForm(false);
        fetchPatients();
      } else {
        alert(data.message || "Failed to create patient");
      }
    } catch (error) {
      console.error("Create patient error:", error);
      alert("Failed to connect to server");
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormAge("");
    setFormGender("");
    setFormPhone("");
    setFormEmail("");
    setFormHistory("");
    setFormSymptoms([]);
    setFormOtherSymptom("");
  };

  const toggleSymptom = (symptom: string) => {
    setFormSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const getRiskBadge = (risk: string | undefined) => {
    if (!risk) return null;
    const r = risk.toLowerCase();
    if (r === "high")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          <AlertTriangle className="w-3 h-3" /> High Risk
        </span>
      );
    if (r === "moderate")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
          <AlertTriangle className="w-3 h-3" /> Moderate
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
        <CheckCircle2 className="w-3 h-3" /> Low Risk
      </span>
    );
  };

  // ── Patient Detail View ──
  if (selectedPatient) {
    return (
      <div className="space-y-6 animate-slide-up">
        {/* Back button & header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
            ← Back to Patients
          </Button>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{selectedPatient.name}</h2>
                <p className="text-muted-foreground">
                  {selectedPatient.age ? `${selectedPatient.age} yrs` : "Age N/A"} •{" "}
                  {selectedPatient.gender || "Gender N/A"}
                </p>
              </div>
            </div>
            {selectedPatient.last_screening && getRiskBadge(selectedPatient.last_screening.risk)}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {selectedPatient.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                {selectedPatient.contact_phone}
              </div>
            )}
            {selectedPatient.contact_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                {selectedPatient.contact_email}
              </div>
            )}
          </div>

          {/* Medical History */}
          {selectedPatient.medical_history && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" /> Medical History
              </p>
              <p className="text-sm text-foreground">{selectedPatient.medical_history}</p>
            </div>
          )}

          {/* Symptoms */}
          {selectedPatient.symptoms && selectedPatient.symptoms.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Reported Symptoms</p>
              <div className="flex flex-wrap gap-2">
                {selectedPatient.symptoms.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Screening Timeline */}
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Screening History ({selectedPatient.screenings?.length || 0})
            </h3>
            {selectedPatient.screenings && selectedPatient.screenings.length >= 2 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCompareModal(true)}>
                <Columns className="w-4 h-4" />
                Compare History
              </Button>
            )}
          </div>

          {(!selectedPatient.screenings || selectedPatient.screenings.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">No screenings found for this patient.</p>
          ) : (
            <div className="space-y-3">
              {selectedPatient.screenings.map((s) => {
                const risk = s.result || s.risk || "unknown";
                return (
                  <div key={s.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{
                        backgroundColor: risk === 'high' ? 'hsl(var(--destructive))' :
                          risk === 'moderate' ? 'hsl(var(--warning))' : 'hsl(var(--success))'
                      }} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground">
                        {Math.round(s.probability * 100)}%
                      </span>
                      {getRiskBadge(risk)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Comparison Modal ── */}
        {showCompareModal && selectedPatient.screenings && selectedPatient.screenings.length >= 2 && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-background rounded-2xl w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Columns className="w-5 h-5 text-primary" /> 
                    Longitudinal Comparison
                  </h2>
                  <p className="text-sm text-muted-foreground">{selectedPatient.name}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCompareModal(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Select the two most recent for simplicity, or we could add selectors.
                      Given 'screenings' is sorted by ID DESC, [0] is newest, [1] is older.
                      We will show Oldest on Left, Newest on Right.
                   */}
                  {[selectedPatient.screenings[1], selectedPatient.screenings[0]].map((s, idx) => (
                    <div key={s.id} className="space-y-4">
                      <div className="p-4 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {idx === 0 ? "Previous Screening" : "Latest Screening"}
                          </p>
                          <p className="font-medium mt-1">
                            {new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {getRiskBadge(s.result || s.risk)}
                          <p className="text-sm font-mono mt-1 text-muted-foreground">{Math.round(s.probability * 100)}% Conf.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs text-center text-muted-foreground font-medium">Original</p>
                          <div className="aspect-square bg-black rounded-lg overflow-hidden border border-border">
                            {s.original_path ? (
                              <img src={`http://localhost:5000${s.original_path}`} className="w-full h-full object-contain" alt="Original" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No Image</div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-center text-primary font-medium">AI Heatmap</p>
                          <div className="aspect-square bg-black rounded-lg overflow-hidden border border-border">
                            {s.heatmap_path ? (
                              <img src={`http://localhost:5000${s.heatmap_path}`} className="w-full h-full object-contain" alt="Heatmap" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No Heatmap</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {s.notes && (
                        <div className="p-3 bg-muted/20 border border-border rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Clinical Notes</p>
                          <p className="text-sm text-foreground italic text-balance">"{s.notes}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main Patient List View ──
  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name or email..."
            className="pl-10 bg-background/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="hero" onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Patient
        </Button>
      </div>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="p-6 text-center text-muted-foreground">Loading patients...</div>
      ) : patients.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">No patients found</p>
          <p className="text-sm text-muted-foreground">Add a new patient to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => fetchPatientDetail(patient.id)}
              className="glass-strong rounded-2xl p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient.age ? `${patient.age} yrs` : ""} {patient.gender ? `• ${patient.gender}` : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">
                  {patient.screening_count} screening{patient.screening_count !== 1 ? "s" : ""}
                </span>
                {patient.last_screening && getRiskBadge(patient.last_screening.risk)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Patient Modal ── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Add New Patient</h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowAddForm(false); resetForm(); }}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label>Patient Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Full name" className="pl-10" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" placeholder="Age" className="pl-10" value={formAge} onChange={(e) => setFormAge(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={formGender} onValueChange={setFormGender}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="+91 98765 43210" className="pl-10" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="patient@email.com" className="pl-10" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Medical History */}
              <div className="space-y-2">
                <Label>Medical History</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-xl border border-input bg-background/50 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Previous conditions, allergies, ongoing treatments..."
                  value={formHistory}
                  onChange={(e) => setFormHistory(e.target.value)}
                />
              </div>

              {/* Symptoms Checklist */}
              <div className="space-y-2">
                <Label>Reported Symptoms</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SYMPTOM_OPTIONS.map((symptom) => (
                    <label
                      key={symptom}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-all ${formSymptoms.includes(symptom)
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:border-primary/30 text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formSymptoms.includes(symptom)}
                        onChange={() => toggleSymptom(symptom)}
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formSymptoms.includes(symptom) ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                        {formSymptoms.includes(symptom) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {symptom}
                    </label>
                  ))}
                </div>
                <div className="mt-2">
                  <Input
                    placeholder="Other symptoms..."
                    value={formOtherSymptom}
                    onChange={(e) => setFormOtherSymptom(e.target.value)}
                  />
                </div>
              </div>

              <Button variant="hero" size="lg" className="w-full" onClick={handleAddPatient}>
                Save Patient Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfiles;
