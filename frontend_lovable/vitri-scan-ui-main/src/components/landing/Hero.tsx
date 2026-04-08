import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, Shield, Zap, Brain } from "lucide-react";
import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; pulse: number;
}

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.8) saturate(1.2)" }}
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Cinematic gradient overlays - significantly lightened to show video clearly */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1c]/70 via-[#0a0f1c]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c]/90 via-transparent to-transparent" />
        
        {/* Animated color accent */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
      </div>

      {/* 3D floating orbs with glow */}
      <div className="absolute top-1/4 right-[15%] w-72 h-72 rounded-full bg-cyan-500/10 blur-[100px] animate-float z-[1]" />
      <div className="absolute bottom-1/3 left-[20%] w-56 h-56 rounded-full bg-blue-600/10 blur-[80px] animate-float z-[1]" style={{ animationDelay: "3s" }} />
      <div className="absolute top-[60%] right-[40%] w-40 h-40 rounded-full bg-purple-500/8 blur-[60px] animate-float z-[1]" style={{ animationDelay: "5s" }} />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-6 py-24">
        <div className="max-w-2xl animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-sm text-cyan-300 backdrop-blur-md mb-8 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>AI-Powered Tuberculosis Detection</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">TB Screening</span>
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(56,189,248,0.3)]">
              Reimagined
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-lg leading-relaxed">
            Upload chest X-rays and get instant AI-powered risk assessments. Fast, accurate, and designed for healthcare professionals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link to="/login">
              <Button variant="hero" size="xl" className="group relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transition-shadow duration-500">
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </Link>
            <a href="#features">
              <Button variant="hero-outline" size="xl" className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 backdrop-blur-sm transition-all duration-300">
                Learn More
              </Button>
            </a>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-6">
            {[
              { icon: Brain, label: "Multi-Disease AI", value: "4 Conditions" },
              { icon: Zap, label: "Analysis Speed", value: "< 3 Seconds" },
              { icon: Shield, label: "Security", value: "HIPAA Ready" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-default">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs text-white/40">{stat.label}</p>
                  <p className="text-sm font-semibold text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
