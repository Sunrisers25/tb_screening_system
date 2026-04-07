import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import StatsOverview from "@/components/dashboard/StatsOverview";
import FileUpload, { PatientMetadata } from "@/components/dashboard/FileUpload";
import ResultsCard from "@/components/dashboard/ResultsCard";
import HistoryTable from "@/components/dashboard/HistoryTable";
import PatientProfiles from "@/components/dashboard/PatientProfiles";
import { Activity, Menu, X } from "lucide-react";
import Settings from "@/components/dashboard/Settings";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [result, setResult] = useState<{
    risk: "high" | "low" | "moderate" | null;
    confidence: number;
    timestamp: string;
    heatmap?: string;
    notes?: string;
    dicom_metadata?: any;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get("view") || "overview";

  const getTitle = () => {
    switch (currentView) {
      case "history": return "Screening History";
      case "patients": return "Patient Profiles";
      case "settings": return "Settings";
      default: return "Dashboard";
    }
  };

  const getSubtitle = () => {
    switch (currentView) {
      case "history": return "View past screening records";
      case "patients": return "Manage patient records and medical history";
      case "settings": return "Manage application preferences";
      default: return "Upload chest X-rays for TB risk assessment";
    }
  };

  const handleFileSelect = async (file: File, metadata: PatientMetadata) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("patientName", metadata.name);
    formData.append("age", metadata.age);
    formData.append("gender", metadata.gender);
    if (metadata.patientId) {
      formData.append("patientId", metadata.patientId);
    }

    try {
      const response = await fetch("http://localhost:5000/api/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        alert("Analysis failed: " + data.error);
        return;
      }

      setResult({
        risk: data.risk as "high" | "low" | "moderate",
        confidence: data.confidence,
        timestamp: data.timestamp,
        heatmap: data.heatmap,
        notes: data.notes,
        dicom_metadata: data.dicom_metadata || undefined,
      });

    } catch (error) {
      console.error("Prediction Error:", error);
      alert("Failed to connect to server");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <main className="flex-1 min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">TB Screening AI</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        <div className="p-6 lg:p-10 max-w-6xl mx-auto">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{getTitle()}</h1>
            <p className="text-muted-foreground mt-1">{getSubtitle()}</p>
          </div>

          {currentView === "overview" && (
            <>
              {/* Stats overview */}
              <StatsOverview />
              {/* Upload + Results grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <FileUpload onFileSelect={handleFileSelect} />
                <ResultsCard result={result} />
              </div>

              {/* Recent History */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <HistoryTable limit={5} />
              </div>
            </>
          )}

          {currentView === "history" && (
            <HistoryTable />
          )}

          {currentView === "patients" && (
            <PatientProfiles />
          )}

          {currentView === "settings" && (
            <Settings />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
