import { Activity } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">TB Screening AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 TB Screening AI. For research and clinical decision support only.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
