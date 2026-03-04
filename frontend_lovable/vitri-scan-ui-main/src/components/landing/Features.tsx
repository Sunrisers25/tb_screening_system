import { Upload, Shield, Clock, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Easy Upload",
    description: "Drag and drop chest X-ray images for instant analysis. Supports DICOM, PNG, and JPEG formats.",
  },
  {
    icon: Shield,
    title: "AI-Powered Analysis",
    description: "Deep learning model trained on thousands of annotated X-rays for reliable TB risk assessment.",
  },
  {
    icon: Clock,
    title: "Instant Results",
    description: "Get risk classification and confidence scores in seconds, not hours. Accelerate your workflow.",
  },
  {
    icon: BarChart3,
    title: "Detailed Reports",
    description: "Track screening history, view trends, and export comprehensive reports for your records.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 gradient-surface">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Powerful Screening Tools
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need for efficient tuberculosis screening, powered by cutting-edge artificial intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
