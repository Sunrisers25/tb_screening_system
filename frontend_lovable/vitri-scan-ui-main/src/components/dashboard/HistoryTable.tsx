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
}

interface HistoryTableProps {
  limit?: number;
}

const HistoryTable = ({ limit }: HistoryTableProps) => {
  const [data, setData] = useState<ScreeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ScreeningRecord | null>(null);

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
          heatmap_path: log.heatmap_path ? `http://localhost:5000${log.heatmap_path}` : undefined
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
    window.open("http://localhost:5000/api/export_pdf_summary", "_blank");
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
                        <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{record.confidence}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => window.open(`http://localhost:5000/api/history/${record.id}/pdf`, '_blank')} title="Download Report">
                            <FileText className="w-4 h-4 text-primary" />
                          </Button>
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
          </div>
        </div>
      )}
    </>
  );
};

export default HistoryTable;
