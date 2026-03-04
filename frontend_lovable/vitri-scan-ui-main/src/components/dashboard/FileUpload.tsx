import { useState, useCallback } from "react";
import { Upload, Image, X, User, Calendar, Activity, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PatientMetadata {
  name: string;
  age: string;
  gender: string;
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
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
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
  };

  const handleAnalyze = () => {
    if (file && patientName) {
      onFileSelect(file, { name: patientName, age, gender });
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

      <div className="space-y-4 mb-6">
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

      </div>

      <div className="border-t border-border/50 my-4"></div>

      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4 text-primary" />
        Upload X-Ray
      </h4>

      {!preview ? (
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
        </div>
      ) : (
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
      )}

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
