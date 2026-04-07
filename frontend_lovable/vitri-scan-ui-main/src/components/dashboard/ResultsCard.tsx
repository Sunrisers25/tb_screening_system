import { AlertTriangle, CheckCircle2, Activity, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ResultsCardProps {
  result: {
    risk: "high" | "low" | "moderate" | null;
    confidence: number;
    timestamp: string;
    heatmap?: string;
    notes?: string;
    patientName?: string;
    patientAge?: string;
    patientGender?: string;
    dicom_metadata?: {
      patient_name?: string;
      study_date?: string;
      modality?: string;
      institution?: string;
    };
  } | null;
}

const ResultsCard = ({ result }: ResultsCardProps) => {
  const generatePDF = async () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const reportId = Math.random().toString(36).substr(2, 9).toUpperCase();

    // ════════════════════════════════════════
    //  PAGE 1 — Header, Patient Info, Results
    // ════════════════════════════════════════

    // ── Header Bar ──
    doc.setFillColor(20, 60, 100);
    doc.rect(0, 0, pageWidth, 35, "F");
    // Accent stripe
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 35, pageWidth, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("TB Screening Report", margin, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Chest X-Ray Analysis", margin, 24);
    doc.text(`Report ID: ${reportId}`, margin, 30);

    // Date on right
    doc.setFontSize(9);
    doc.text(`${new Date().toLocaleDateString()}  |  ${result.timestamp}`, pageWidth - margin, 30, { align: "right" });

    // ── Patient Information Box ──
    let y = 48;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y - 5, contentWidth, 32, 2, 2, "F");
    doc.setDrawColor(200, 210, 225);
    doc.roundedRect(margin, y - 5, contentWidth, 32, 2, 2, "S");

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PATIENT INFORMATION", margin + 5, y + 1);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`${result.patientName || "Unknown"}`, margin + 5, y + 10);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const ageGender = [
      result.patientAge ? `Age: ${result.patientAge}` : null,
      result.patientGender ? `Gender: ${result.patientGender}` : null,
    ].filter(Boolean).join("   |   ");
    doc.text(ageGender || "Age: N/A  |  Gender: N/A", margin + 5, y + 18);

    // DICOM metadata inline if available
    if (result.dicom_metadata) {
      const dicomInfo = [
        result.dicom_metadata.modality ? `Modality: ${result.dicom_metadata.modality}` : null,
        result.dicom_metadata.institution ? `Institution: ${result.dicom_metadata.institution}` : null,
        result.dicom_metadata.study_date ? `Study: ${result.dicom_metadata.study_date}` : null,
      ].filter(Boolean).join("   |   ");
      if (dicomInfo) {
        doc.setFontSize(8);
        doc.setTextColor(41, 128, 185);
        doc.text(`📋 DICOM: ${dicomInfo}`, margin + 5, y + 24);
      }
    }

    // ── Risk Assessment Box ──
    y = 88;
    const riskLabel = `${(result.risk || "unknown").toUpperCase()} RISK`;
    let riskColorR = 46, riskColorG = 125, riskColorB = 50; // green
    if (result.risk === "high") { riskColorR = 192; riskColorG = 57; riskColorB = 43; }
    else if (result.risk === "moderate") { riskColorR = 230; riskColorG = 126; riskColorB = 34; }

    doc.setFillColor(riskColorR, riskColorG, riskColorB);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(riskLabel, margin + 8, y + 10);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Confidence: ${result.confidence}%`, margin + 8, y + 17);

    // Confidence bar background
    const barX = pageWidth - margin - 82;
    const barY = y + 7;
    const barWidth = 74;
    const barHeight = 8;
    doc.setFillColor(255, 255, 255, 80);
    doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, "F");
    // Confidence bar fill
    const fillWidth = (result.confidence / 100) * barWidth;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(barX, barY, fillWidth, barHeight, 2, 2, "F");

    // ── Clinical Findings Section ──
    y = 118;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Clinical Findings", margin, y);

    // Separator line
    doc.setDrawColor(200, 210, 225);
    doc.line(margin, y + 3, pageWidth - margin, y + 3);

    y += 10;
    if (result.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const splitNotes = doc.splitTextToSize(result.notes, contentWidth - 10);
      doc.text(splitNotes, margin + 2, y);
      y += splitNotes.length * 5 + 8;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("No clinical findings recorded.", margin + 2, y);
      y += 12;
    }

    // ── Heatmap Section ──
    if (result.heatmap) {
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("AI Heatmap Analysis", margin, y);
      doc.setDrawColor(200, 210, 225);
      doc.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 7;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("Red/warm areas indicate regions of high feature activation (suspicious areas identified by AI).", margin, y);
      y += 5;

      try {
        const imgWidth = 100;
        const imgHeight = 75;
        const imgX = (pageWidth - imgWidth) / 2;

        doc.setDrawColor(200, 210, 225);
        doc.roundedRect(imgX - 2, y - 2, imgWidth + 4, imgHeight + 4, 2, 2, "S");
        doc.addImage(`data:image/png;base64,${result.heatmap}`, "PNG", imgX, y, imgWidth, imgHeight);
        y += imgHeight + 6;
      } catch (e) {
        console.error("Error adding heatmap to PDF", e);
      }
    }

    // ════════════════════════════════════════
    //  SIGNATURE — Right after content
    // ════════════════════════════════════════
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.email) {
          const sigResponse = await fetch(`http://localhost:5000/api/auth/signature/${user.email}`);
          const sigData = await sigResponse.json();
          if (sigData.success && sigData.signature) {
            // Only add new page if absolutely no room (need ~40px for signature block)
            if (y > 250) {
              doc.addPage();
              y = 20;
            }

            const sigY = y + 4;

            // Signature label
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(80, 80, 80);
            doc.text("AUTHORIZED SIGNATURE", margin, sigY);

            // Signature image
            try {
              doc.addImage(sigData.signature, "PNG", margin, sigY + 2, 55, 18);
            } catch (e) {
              console.error("Signature image error", e);
            }

            // Signature line
            doc.setDrawColor(60, 60, 60);
            doc.setLineWidth(0.5);
            doc.line(margin, sigY + 21, margin + 80, sigY + 21);
            doc.setLineWidth(0.2);

            // Name and date
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 30, 30);
            doc.text(`Dr. ${sigData.username || user.name}`, margin, sigY + 27);

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(`Signed on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, sigY + 32);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching signature for PDF", e);
    }

    // ── Footer — Disclaimer ──
    const footerY = 282;
    doc.setDrawColor(200, 210, 225);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(140, 140, 140);
    doc.text("DISCLAIMER: This report is generated by an AI-powered screening system and is intended for clinical decision support only.", margin, footerY);
    doc.text("It does not constitute a medical diagnosis. Please consult a qualified healthcare professional for final assessment.", margin, footerY + 4);

    doc.save(`TB_Report_${result.patientName || "Patient"}_${reportId}.pdf`);
  };

  if (!result) {
    return (
      <div className="glass-strong rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Analysis Results
        </h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Upload an X-ray image to see results</p>
        </div>
      </div>
    );
  }

  const isHighRisk = result.risk === "high";
  const isModerateRisk = result.risk === "moderate";

  let statusColor = "text-success";
  let statusBg = "bg-success/10 border-success/20";
  let statusIcon = <CheckCircle2 className="w-8 h-8 text-success" />;
  let statusText = "Low Risk";
  let progressBarColor = "bg-success";

  if (isHighRisk) {
    statusColor = "text-destructive";
    statusBg = "bg-destructive/10 border-destructive/20";
    statusIcon = <AlertTriangle className="w-8 h-8 text-destructive" />;
    statusText = "High Risk";
    progressBarColor = "bg-destructive";
  } else if (isModerateRisk) {
    statusColor = "text-warning";
    statusBg = "bg-warning/10 border-warning/20";
    statusIcon = <AlertTriangle className="w-8 h-8 text-warning" />;
    statusText = "Moderate Risk";
    progressBarColor = "bg-warning";
  }

  return (
    <div className="glass-strong rounded-2xl p-6 animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Analysis Results
      </h3>

      {/* Patient Info */}
      {result.patientName && (
        <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{result.patientName}</p>
            <p className="text-xs text-muted-foreground">
              {result.patientAge ? `${result.patientAge} yrs` : ''}{result.patientGender ? ` • ${result.patientGender}` : ''}
            </p>
          </div>
        </div>
      )}
      <div className={`rounded-xl p-6 border ${statusBg}`}>
        <div className="flex items-center gap-3 mb-4">
          {statusIcon}
          <div>
            <p className={`text-2xl font-bold ${statusColor}`}>
              {statusText}
            </p>
            <p className="text-sm text-muted-foreground">TB Detection Result</p>
          </div>
        </div>

        {/* DICOM Metadata Badge */}
        {result.dicom_metadata && (
          <div className="mb-4 p-3 bg-accent/5 rounded-lg border border-accent/20">
            <p className="text-xs font-semibold text-accent mb-1 flex items-center gap-1">
              📋 DICOM Source Data
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {result.dicom_metadata.modality && <p>Modality: <span className="text-foreground">{result.dicom_metadata.modality}</span></p>}
              {result.dicom_metadata.study_date && <p>Study: <span className="text-foreground">{result.dicom_metadata.study_date}</span></p>}
              {result.dicom_metadata.institution && <p>Institution: <span className="text-foreground">{result.dicom_metadata.institution}</span></p>}
            </div>
          </div>
        )}

        {/* Heatmap Visualization */}
        {result.heatmap && (
          <div className="mb-6">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              AI Heatmap Analysis
            </p>
            <div className="relative rounded-lg overflow-hidden border border-border/50 aspect-video bg-black/5">
              <img
                src={`data:image/png;base64,${result.heatmap}`}
                alt="AI Heatmap"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Red areas indicate high feature activation (suspicious regions).
            </p>
          </div>
        )}

        {/* Clinical Notes Display */}
        {result.notes && (
          <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Clinical Findings
            </p>
            <p className="text-sm text-foreground/80 italic leading-relaxed">
              "{result.notes}"
            </p>
          </div>
        )}

        {/* Confidence bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Confidence Score</span>
            <span className="font-semibold text-foreground">{result.confidence}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${progressBarColor}`}
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={generatePDF} className="w-full gap-2" variant="outline">
          <Download className="w-4 h-4" />
          Download Detailed Report
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Analyzed at {result.timestamp} • For clinical decision support only
        </p>
      </div>
    </div>
  );
};

export default ResultsCard;
