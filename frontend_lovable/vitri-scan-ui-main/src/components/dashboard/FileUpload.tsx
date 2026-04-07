import { useState, useCallback, useEffect } from "react";
import { Upload, Image, X, User, Calendar, Activity, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PatientMetadata {
  name: string;
  age: string;
  gender: string;
  patientId?: string;
}

interface PatientOption {
  id: number;
  name: string;
  age?: number;
  gender?: string;
}

interface FileUploadProps {
  onFileSelect: (file: File, metadata: PatientMetadata) => void;
}

const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [isDicom, setIsDicom] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [inputMode, setInputMode] = useState<"manual" | "existing">("manual");

  // Fetch existing patients for the dropdown
  useEffect(() => {
    fetch("http://localhost:5000/api/patients")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPatients(data.map((p: any) => ({
            id: p.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
          })));
        }
      })
      .catch(console.error);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);

    // Check for DICOM
    const isDcm = selectedFile.name.toLowerCase().endsWith('.dcm');
    setIsDicom(isDcm);

    if (isDcm) {
      setPreview("dicom");
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setIsDicom(false);
  };

  const handlePatientSelect = (patientIdStr: string) => {
    setSelectedPatientId(patientIdStr);
    const patient = patients.find((p) => String(p.id) === patientIdStr);
    if (patient) {
      setPatientName(patient.name);
      setAge(patient.age ? String(patient.age) : "");
      setGender(patient.gender || "");
    }
  };

  const handleAnalyze = () => {
    if (file && patientName) {
      onFileSelect(file, {
        name: patientName,
        age,
        gender,
        patientId: inputMode === "existing" ? selectedPatientId : undefined,
      });
    } else {
      alert("Please select a file and enter patient name.");
    }
  };

  return (
    <div className="glass-strong rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        New Screening
      </h3>

      {/* Patient Input Mode Toggle */}
      {patients.length > 0 && (
        <div className="flex rounded-xl bg-muted p-1 mb-4">
          <button
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-300 ${inputMode === "manual"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
            onClick={() => { setInputMode("manual"); setSelectedPatientId(""); }}
          >
            New Patient
          </button>
          <button
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all duration-300 ${inputMode === "existing"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
            onClick={() => setInputMode("existing")}
          >
            Existing Patient
          </button>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {inputMode === "existing" && patients.length > 0 ? (
          <div className="space-y-2">
            <Label>Select Patient</Label>
            <Select value={selectedPatientId} onValueChange={handlePatientSelect}>
              <SelectTrigger className="bg-background/50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder="Choose a patient..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} {p.age ? `(${p.age} yrs)` : ""} {p.gender ? `• ${p.gender}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="pName">Patient Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="pName"
                  placeholder="Enter patient name"
                  className="pl-10 bg-background/50"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="age"
                    placeholder="Age"
                    type="number"
                    className="pl-10 bg-background/50"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border/50 my-4"></div>

      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4 text-primary" />
        Upload X-Ray
        <span className="text-xs font-normal text-muted-foreground ml-1">(JPG, PNG, or DICOM)</span>
      </h4>

      {/* Check if patient details are filled */}
      {(() => {
        const detailsFilled = inputMode === "existing" ? !!selectedPatientId : !!patientName.trim();

        if (!detailsFilled) {
          return (
            <div className="border-2 border-dashed rounded-xl p-8 text-center border-border/40 bg-muted/20 opacity-60 cursor-not-allowed">
              <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                <Image className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                Enter patient details first
              </p>
              <p className="text-xs text-muted-foreground">
                {inputMode === "existing" ? "Select an existing patient above to continue" : "Fill in the patient name above to enable upload"}
              </p>
            </div>
          );
        }

        if (!preview) {
          return (
            <div
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
            >
              <input
                type="file"
                accept="image/*,.dcm"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 rounded-xl gradient-primary mx-auto mb-3 flex items-center justify-center">
                <Image className="w-6 h-6 text-primary-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium mb-1">
                Drop X-ray here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, and DICOM (.dcm) files
              </p>
            </div>
          );
        }

        if (isDicom) {
          return (
            <div className="relative rounded-xl overflow-hidden bg-foreground/5 border border-border p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 mx-auto mb-3 flex items-center justify-center">
                <FileText className="w-8 h-8 text-accent" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-2">
                📋 DICOM File Detected
              </div>
              <p className="text-sm font-medium text-foreground">{file?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Medical imaging file • Metadata will be auto-extracted
              </p>
              <div className="absolute top-2 right-2">
                <Button variant="destructive" size="icon" onClick={clearFile} className="rounded-full h-8 w-8 shadow-md">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="relative rounded-xl overflow-hidden bg-foreground/5 border border-border">
            <img
              src={preview}
              alt="X-ray preview"
              className="w-full h-48 object-contain bg-black/20"
            />
            <div className="absolute top-2 right-2">
              <Button variant="destructive" size="icon" onClick={clearFile} className="rounded-full h-8 w-8 shadow-md">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })()}

      <Button
        variant="hero"
        size="lg"
        className="w-full mt-6"
        onClick={handleAnalyze}
        disabled={!file || !patientName}
      >
        Analyze Screening
      </Button>
    </div>
  );
};

export default FileUpload;
