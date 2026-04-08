import { Link, useLocation } from "react-router-dom";
import { Activity, LayoutDashboard, History, Settings, LogOut, Users } from "lucide-react";

import { useEffect, useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard?view=overview", roles: ['admin', 'doctor', 'radiographer'] },
  { icon: Users, label: "Patients", href: "/dashboard?view=patients", roles: ['admin', 'doctor', 'radiographer'] },
  { icon: History, label: "History", href: "/dashboard?view=history", roles: ['admin', 'doctor', 'radiographer', 'patient'] },
  { icon: Settings, label: "Settings", href: "/dashboard?view=settings", roles: ['admin', 'doctor', 'radiographer', 'patient'] },
];

const DashboardSidebar = () => {
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentView = searchParams.get("view") || (user?.role === 'patient' ? 'history' : 'overview');

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">TB Screening AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems
          .filter(item => item.roles.includes(user?.role || 'radiographer'))
          .map((item) => {
          // Extract view param from href
          const hrefUrl = new URL(item.href, "http://dummy.com"); // base needed for relative paths
          const itemView = hrefUrl.searchParams.get("view");

          const isActive = currentView === itemView;

          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <item.icon className="w-5 h-5" />
              {user?.role === 'patient' && item.label === 'History' ? 'My Records' : item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </Link>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
