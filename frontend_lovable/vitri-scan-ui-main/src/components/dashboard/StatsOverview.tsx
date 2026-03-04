import { FileSearch, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";

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

const StatsOverview = () => {
  const stats: StatCardProps[] = [
    {
      icon: FileSearch,
      label: "Total Screenings",
      value: 1284,
      subtitle: "+12 this week",
      accentClass: "bg-primary/10 text-primary",
    },
    {
      icon: AlertTriangle,
      label: "High Risk Detected",
      value: 83,
      subtitle: "6.5% of total",
      accentClass: "bg-destructive/10 text-destructive",
    },
    {
      icon: CheckCircle2,
      label: "Low Risk",
      value: 1201,
      subtitle: "93.5% of total",
      accentClass: "bg-success/10 text-success",
    },
    {
      icon: TrendingUp,
      label: "Avg. Confidence",
      value: "94.2%",
      subtitle: "Across all screenings",
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
