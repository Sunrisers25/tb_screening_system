import { Activity } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-white/[0.06] py-12" style={{ background: "#0a0f1c" }}>
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">TB Screening AI</span>
          </div>
          <p className="text-sm text-white/40">
            © 2026 TB Screening AI. For research and clinical decision support only.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
