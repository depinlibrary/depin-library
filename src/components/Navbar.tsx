import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LogOut, Plus, User, Shield, Menu, X, Sun, Moon, ChevronDown, BarChart3, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import NotificationDropdown from "@/components/NotificationDropdown";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const isMarketActive = location.pathname === "/market" || location.pathname === "/forecasts";

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);
  const marketDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(e.target as Node)) {
        setMarketDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navLinks = [
    { to: "/", label: "Overview" },
    { to: "/explore", label: "Explore" },
    { to: "/compare", label: "Compare" },
    { to: "/portfolio", label: "Portfolio" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo — left */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMobileOpen(false)}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 glow-primary-sm">
            <span className="text-sm">⬡</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            DePIN <span className="text-primary">Library</span>
          </span>
        </Link>

        {/* Desktop nav links — centered */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-4">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
          {/* Market mega dropdown */}
           <div 
             className="relative" 
             ref={marketDropdownRef}
             onMouseEnter={() => setMarketDropdownOpen(true)}
             onMouseLeave={() => setMarketDropdownOpen(false)}
           >
             <button
               onClick={() => setMarketDropdownOpen((v) => !v)}
               className={`flex items-center gap-1 text-sm transition-colors ${
                 isMarketActive 
                   ? "text-primary font-medium" 
                   : "text-muted-foreground hover:text-foreground"
               }`}
             >
               Market
               <ChevronDown className={`h-3.5 w-3.5 transition-transform ${marketDropdownOpen ? "rotate-180" : ""}`} />
             </button>
            <AnimatePresence>
              {marketDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-64 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-xl p-2"
                >
                  <Link
                    to="/market"
                    onClick={() => setMarketDropdownOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Token Market</p>
                      <p className="text-[11px] text-muted-foreground">Prices, charts & market data</p>
                    </div>
                  </Link>
                  <Link
                    to="/forecasts"
                    onClick={() => setMarketDropdownOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Forecasts</p>
                      <p className="text-[11px] text-muted-foreground">Community predictions & voting</p>
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Desktop auth actions — right */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-all hover:bg-secondary"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
          </button>

          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </Link>
              )}
              <Link
                to="/submit"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary"
              >
                <Plus className="h-3 w-3" />
                Submit
              </Link>
              <button
                onClick={handleSignOut}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-all hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              <User className="h-3 w-3" />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden ml-auto">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground py-1"
                >
                  {link.label}
                </Link>
              ))}
              {/* Mobile market section */}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mt-1">Market</p>
              <Link to="/market" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1">
                <BarChart3 className="h-3.5 w-3.5" /> Token Market
              </Link>
              <Link to="/forecasts" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1">
                <TrendingUp className="h-3.5 w-3.5" /> Forecasts
              </Link>
              <div className="border-t border-border/50 pt-3 mt-1 flex flex-col gap-3">
                <button onClick={() => { toggleTheme(); setMobileOpen(false); }} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                {user ? (
                  <>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" /> Admin
                      </Link>
                    )}
                    <Link to="/submit" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" /> Submit Project
                    </Link>
                    <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <LogOut className="h-3.5 w-3.5" /> Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/auth" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                    <User className="h-3.5 w-3.5" /> Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
