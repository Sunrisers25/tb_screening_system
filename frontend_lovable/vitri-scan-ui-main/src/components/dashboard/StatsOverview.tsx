import { FileSearch, AlertTriangle, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle: string;
  accentClass: string;
}

const StatCard = ({ icon: Icon, label, value, subtitle, accentClass }: StatCardProps) => (
  <div className="glass-strong rounded-2xl p-6 group hover:-translate-y-0.5 transition-all duration-300">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentClass}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-2xl lg:text-3xl font-bold text-foreground">{value}</p>
    <p className="text-sm font-medium text-foreground mt-1">{label}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
  </div>
);

interface StatsData {
  total_screenings: number;
  high_risk: number;
  low_risk: number;
  moderate_risk: number;
  avg_confidence: number;
  this_week: number;
  patient_count: number;
}

const StatsOverview = () => {
  const [statsData, setStatsData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/stats")
      .then((res) => res.json())
      .then((data) => setStatsData(data))
      .catch(console.error);
  }, []);

  const total = statsData?.total_screenings || 0;
  const highRisk = statsData?.high_risk || 0;
  const lowRisk = statsData?.low_risk || 0;
  const avgConf = statsData?.avg_confidence || 0;
  const thisWeek = statsData?.this_week || 0;
  const patientCount = statsData?.patient_count || 0;

  const highPercent = total > 0 ? ((highRisk / total) * 100).toFixed(1) : "0";
  const lowPercent = total > 0 ? ((lowRisk / total) * 100).toFixed(1) : "0";

  const stats: StatCardProps[] = [
    {
      icon: FileSearch,
      label: "Total Screenings",
      value: total,
      subtitle: `+${thisWeek} this week`,
      accentClass: "bg-primary/10 text-primary",
    },
    {
      icon: AlertTriangle,
      label: "High Risk Detected",
      value: highRisk,
      subtitle: `${highPercent}% of total`,
      accentClass: "bg-destructive/10 text-destructive",
    },
    {
      icon: CheckCircle2,
      label: "Low Risk",
      value: lowRisk,
      subtitle: `${lowPercent}% of total`,
      accentClass: "bg-success/10 text-success",
    },
    {
      icon: Users,
      label: "Registered Patients",
      value: patientCount,
      subtitle: `Avg. confidence: ${avgConf}%`,
      accentClass: "bg-accent/10 text-accent",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
};

export default StatsOverview;
