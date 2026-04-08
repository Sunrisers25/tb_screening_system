import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get form data
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const name = isLogin ? "" : (form.elements.namedItem('name') as HTMLInputElement).value;
    const role = isLogin ? "" : (form.elements.namedItem('role') as HTMLSelectElement).value;

    const endpoint = isLogin ? "http://localhost:5000/api/auth/login" : "http://localhost:5000/api/auth/signup";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role })
      });

      const data = await response.json();

      if (data.success) {
        if (isLogin) {
          // Store user info
          localStorage.setItem('user', JSON.stringify(data.user));
          navigate("/dashboard");
        } else {
          // If signup success, switch to login
          alert("Account created! Please wait for an Admin to approve your account before logging in.");
          setIsLogin(true);
        }
      } else {
        alert(data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth Error:", error);
      alert("Failed to connect to server");
    }
  };

  return (
    <div className="min-h-screen gradient-surface flex items-center justify-center p-6">
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-foreground">TB Screening AI</span>
        </Link>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8">
          {/* Tab switch */}
          <div className="flex rounded-xl bg-muted p-1 mb-8">
            <button
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 ${isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setIsLogin(true)}
            >
              Log In
            </button>
            <button
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 ${!isLogin ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Dr. Jane Smith"
                      className="pl-10 h-11 rounded-xl border-border bg-background/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="role" className="text-sm font-medium text-foreground">
                    Requested Role
                  </Label>
                  <select 
                    id="role" 
                    name="role" 
                    className="flex w-full pl-3 pr-8 h-11 rounded-xl border border-border bg-background/50 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    <option value="radiographer">Radiographer (Upload & View)</option>
                    <option value="doctor">Doctor (Clinical Review)</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@hospital.org"
                  className="pl-10 h-11 rounded-xl border-border bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 rounded-xl border-border bg-background/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button type="button" className="text-sm text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full">
              {isLogin ? "Log In" : "Create Account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
