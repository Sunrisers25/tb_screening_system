import { History, AlertTriangle, CheckCircle2, Eye, Trash2, X, FileText, Download, FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ScreeningRecord {
  id: string;
  patientName: string;
  age?: string;
  gender?: string;
  notes?: string;
  date: string;
  risk: "high" | "low" | "moderate";
  confidence: number;
  status: string;
  filename: string;
  original_path?: string;
  heatmap_path?: string;
  doctor_review_status?: "pending" | "approved" | "overridden";
  doctor_notes?: string;
  final_risk?: "high" | "low" | "moderate" | "uncertain";
}

interface HistoryTableProps {
  limit?: number;
}

const HistoryTable = ({ limit }: HistoryTableProps) => {
  const [data, setData] = useState<ScreeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ScreeningRecord | null>(null);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) {}
    }
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/history");
      if (response.ok) {
        const logs = await response.json();
        const mappedData: ScreeningRecord[] = logs.map((log: any) => ({
          id: log.id,
          patientName: log.patient_name || "Unknown",
          age: log.age,
          gender: log.gender,
          notes: log.notes,
          date: new Date(log.timestamp).toLocaleDateString() + " " + new Date(log.timestamp).toLocaleTimeString(),
          risk: log.risk ? log.risk.toLowerCase() : 'unknown',
          confidence: Math.round(log.probability * 100),
          status: "Completed",
          filename: log.filename,
          original_path: log.original_path ? `http://localhost:5000${log.original_path}` : undefined,
          heatmap_path: log.heatmap_path ? `http://localhost:5000${log.heatmap_path}` : undefined,
          doctor_review_status: log.doctor_review_status || 'pending',
          doctor_notes: log.doctor_notes || '',
          final_risk: log.final_risk || log.risk
        }));
        setData(mappedData);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    window.open("http://localhost:5000/api/export_csv", "_blank");
  };

  const handleExportPDF = () => {
    window.open("http://localhost:5000/api/export_pdf_summary?user_email=" + encodeURIComponent(user?.email || 'unknown'), "_blank");
  };

  const handleExportSinglePDF = (id: string, lang: string) => {
    window.open(`http://localhost:5000/api/history/${id}/pdf?lang=${lang}&user_email=${encodeURIComponent(user?.email || 'unknown')}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/history/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setData(data.filter(item => item.id !== id));
      } else {
        alert("Failed to delete record");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewRisk, setReviewRisk] = useState<"high" | "low" | "moderate" | "uncertain">("low");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleReviewSubmit = async (status: "approved" | "overridden") => {
    if (!selectedReport) return;
    setIsSubmittingReview(true);
    
    // If approved, use the original AI risk. If overridden, use the selected manual risk.
    const finalRisk = status === "approved" ? selectedReport.risk : reviewRisk;

    try {
      const response = await fetch(`http://localhost:5000/api/history/${selectedReport.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_status: status,
          doctor_notes: reviewNotes,
          final_risk: finalRisk
        })
      });

      if (response.ok) {
        // Update local state
        const updatedRecord = {
          ...selectedReport,
          doctor_review_status: status,
          doctor_notes: reviewNotes,
          final_risk: finalRisk
        };
        setSelectedReport(updatedRecord);
        setData(data.map(item => item.id === selectedReport.id ? updatedRecord : item));
      } else {
        alert("Failed to submit review");
      }
    } catch (error) {
      console.error("Review submit error:", error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Reset review form when modal opens
  useEffect(() => {
    if (selectedReport) {
      setReviewNotes(selectedReport.doctor_notes || "");
      setReviewRisk(selectedReport.final_risk || selectedReport.risk || "low");
    }
  }, [selectedReport]);

  const displayedData = limit ? data.slice(0, limit) : data;

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading history...</div>
  }

  return (
    <>
      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Screening History
          </h3>

          {!limit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-border">
                <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer text-foreground hover:bg-muted">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer text-foreground hover:bg-muted">
                  <FileText className="w-4 h-4 text-red-600" />
                  Export as PDF Summary
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Filename</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Patient</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Result</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Confidence</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No screening history found.</td>
                </tr>
              ) : (
                displayedData.map((record, index) => {
                  const isHigh = record.risk === "high";
                  const isModerate = record.risk === "moderate";

                  let color = "text-success";
                  let Icon = CheckCircle2;
                  let label = "Low Risk";

                  if (isHigh) {
                    color = "text-destructive";
                    Icon = AlertTriangle;
                    label = "High Risk";
                  } else if (isModerate) {
                    color = "text-warning";
                    Icon = AlertTriangle;
                    label = "Moderate Risk";
                  }

                  return (
                    <tr
                      key={index}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-200"
                    >
                      <td className="py-3 px-4 text-sm font-mono text-foreground">{record.filename}</td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        <div className="font-medium">{record.patientName}</div>
                        {(record.age || record.gender) && (
                          <div className="text-xs text-muted-foreground">
                            {record.age ? `${record.age} yrs` : ''}
                            {record.gender ? ` • ${record.gender}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{record.date}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                          </span>
                          {record.doctor_review_status && record.doctor_review_status !== 'pending' && (
                            <span className="text-[10px] uppercase font-semibold text-primary">
                              {record.doctor_review_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{record.confidence}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="Download Report">
                                <FileText className="w-4 h-4 text-primary" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border-border">
                              <DropdownMenuLabel>Select Language</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleExportSinglePDF(record.id, 'en')} className="cursor-pointer text-foreground hover:bg-muted">
                                English
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportSinglePDF(record.id, 'hi')} className="cursor-pointer text-foreground hover:bg-muted font-medium">
                                Hindi (हिंदी)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportSinglePDF(record.id, 'te')} className="cursor-pointer text-foreground hover:bg-muted font-medium">
                                Telugu (తెలుగు)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportSinglePDF(record.id, 'kn')} className="cursor-pointer text-foreground hover:bg-muted font-medium">
                                Kannada (ಕನ್ನಡ)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedReport(record)} title="View Report">
                            <Eye className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} title="Delete Report">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Screening Report</h2>
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">{selectedReport.patientName}</p>
                  <p className="text-sm">
                    {selectedReport.age ? `${selectedReport.age} yrs` : 'Age: N/A'} • {selectedReport.gender || 'Gender: N/A'}
                  </p>
                  <p className="text-xs mt-1">{selectedReport.date}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedReport(null)}>
                <X className="w-6 h-6" />
              </Button>
            </div>

            {selectedReport.notes && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Clinical Notes</p>
                <p className="text-sm text-foreground italic">"{selectedReport.notes}"</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Original X-Ray</h4>
                <div className="aspect-square bg-muted rounded-xl overflow-hidden border border-border">
                  {selectedReport.original_path ? (
                    <img src={selectedReport.original_path} alt="Original" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No Image Available</div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">AI Heatmap Analysis</h4>
                <div className="aspect-square bg-muted rounded-xl overflow-hidden border border-border">
                  {selectedReport.heatmap_path ? (
                    <img src={selectedReport.heatmap_path} alt="Heatmap" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No Heatmap Available</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Assessment</p>
                  <p className={`text-2xl font-bold mt-1 ${selectedReport.risk === 'high' ? 'text-destructive' :
                    selectedReport.risk === 'moderate' ? 'text-warning' : 'text-success'
                    }`}>
                    {selectedReport.risk.toUpperCase()} RISK
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">AI Confidence</p>
                  <p className="text-2xl font-bold mt-1 text-foreground">{selectedReport.confidence}%</p>
                </div>
              </div>
            </div>

            {/* DOCTOR REVIEW SECTION */}
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" /> 
                Doctor Review
              </h3>
              
              {selectedReport.doctor_review_status === "pending" || !selectedReport.doctor_review_status ? (
                user?.role === 'doctor' || user?.role === 'admin' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <p className="text-sm text-amber-600 font-medium">This screening requires clinical verification.</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Clinical Notes (Optional)</label>
                      <textarea 
                        className="w-full min-h-[80px] rounded-xl border border-input bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Add your observations here..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-sm font-medium text-muted-foreground">Approve AI Findings</label>
                         <Button 
                           variant="default" 
                           className="w-full bg-success hover:bg-success/90"
                           disabled={isSubmittingReview}
                           onClick={() => handleReviewSubmit("approved")}
                         >
                           Approve AI Risk ({selectedReport.risk.toUpperCase()})
                         </Button>
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium text-muted-foreground">Override AI Findings</label>
                         <div className="flex gap-2">
                           <select 
                             className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                             value={reviewRisk}
                             onChange={(e) => setReviewRisk(e.target.value as any)}
                           >
                             <option value="low">Low Risk</option>
                             <option value="moderate">Moderate Risk</option>
                             <option value="high">High Risk</option>
                           </select>
                           <Button 
                             variant="outline"
                             disabled={isSubmittingReview}
                             onClick={() => handleReviewSubmit("overridden")}
                             className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                           >
                             Override
                           </Button>
                         </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/40 rounded-xl border border-border flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Pending Review</p>
                      <p className="text-xs text-muted-foreground">Only authorized physicians can verify or override these AI results.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-4 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="font-semibold capitalize text-foreground">
                      Status: {selectedReport.doctor_review_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                     <div>
                       <span className="text-muted-foreground block text-xs uppercase">Final Verified Risk</span>
                       <span className={`font-semibold ${
                         selectedReport.final_risk === 'high' ? 'text-destructive' : 
                         selectedReport.final_risk === 'moderate' ? 'text-warning' : 'text-success'
                       }`}>
                         {selectedReport.final_risk?.toUpperCase()}
                       </span>
                     </div>
                  </div>
                  {selectedReport.doctor_notes && (
                    <div>
                       <span className="text-muted-foreground block text-xs uppercase mb-1">Doctor's Notes</span>
                       <p className="text-foreground italic bg-background p-3 rounded-md border border-border">
                         "{selectedReport.doctor_notes}"
                       </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </>
  );
};

export default HistoryTable;
