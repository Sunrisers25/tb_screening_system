import { Upload, Shield, Clock, BarChart3, Brain, Globe, Users, FileText } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Multi-Disease AI",
    description: "Simultaneously detects TB, Pneumonia, COVID-19, and Normal findings from a single chest X-ray.",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: Shield,
    title: "Clinical Compliance",
    description: "Full RBAC, admin approval workflows, and immutable audit trails for HIPAA-ready operations.",
    gradient: "from-blue-500 to-purple-600",
  },
  {
    icon: Clock,
    title: "Instant Results",
    description: "AI-powered risk classification and Grad-CAM heatmaps generated in under 3 seconds.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Globe,
    title: "Multilingual Reports",
    description: "Export PDF reports in English, Hindi, Telugu, and Kannada for regional healthcare delivery.",
    gradient: "from-emerald-500 to-cyan-500",
  },
  {
    icon: Upload,
    title: "DICOM Support",
    description: "Industry-standard medical imaging format. Drag, drop, and auto-extract patient metadata.",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: Users,
    title: "Doctor Review",
    description: "Human-in-the-loop verification. Doctors can approve or override AI findings with clinical notes.",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "7-day trend charts, risk distribution breakdowns, and real-time screening volume metrics.",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    icon: FileText,
    title: "Patient Tracking",
    description: "Longitudinal patient profiles with X-ray comparison tools to monitor treatment progression.",
    gradient: "from-pink-500 to-red-500",
  },
];

const Features = () => {
  return (
    <section id="features" className="relative py-28 overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0f1c 0%, #0f172a 50%, #0a0f1c 100%)" }}>
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Glow accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="container relative z-10 mx-auto px-6">
        <div className="text-center mb-20 animate-fade-in">
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-3">Platform Capabilities</p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5">
            Powerful Screening Tools
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            Everything you need for efficient tuberculosis screening, powered by cutting-edge artificial intelligence and modern clinical workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl p-7 border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-1 transition-all duration-500 cursor-default"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {/* Hover glow */}
              <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500 blur-sm`} />
              
              <div className="relative z-10">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all duration-300`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors">{feature.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm group-hover:text-white/55 transition-colors">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
