import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Medical AI technology background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 left-1/3 w-48 h-48 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="container relative z-10 mx-auto px-6 py-24">
        <div className="max-w-2xl animate-slide-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary-foreground/80 backdrop-blur-sm mb-8">
            <Activity className="w-4 h-4" />
            <span>AI-Powered Tuberculosis Detection</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground leading-tight mb-6">
            TB Screening
            <span className="block text-gradient">Reimagined</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/70 mb-10 max-w-lg leading-relaxed">
            Upload chest X-rays and get instant AI-powered risk assessments. Fast, accurate, and designed for healthcare professionals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/login">
              <Button variant="hero" size="xl">
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="hero-outline" size="xl" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Learn More
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
