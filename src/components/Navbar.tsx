import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LogOut, Plus, User, Shield, Menu, X, Sun, Moon, ChevronDown, BarChart3, TrendingUp, Compass, GitCompare, Briefcase, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import NotificationDropdown from "@/components/NotificationDropdown";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);
  const marketDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(e.target as Node)) {
        setMarketDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = useCallback((path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const navLinks = [
    { to: "/", label: "Overview" },
    { to: "/explore", label: "Explore" },
    { to: "/compare", label: "Compare" },
    { to: "/portfolio", label: "Portfolio" },
  ];

  const mobileNavLinks = [
    { to: "/", label: "Overview", icon: Home },
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/compare", label: "Compare", icon: GitCompare },
    { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/90 backdrop-blur-xl shadow-sm shadow-background/10"
          : "border-b border-border/30 bg-background/60 backdrop-blur-xl"
      }`}
    >
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Logo — left */}
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs">⬡</span>
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            DePIN <span className="text-primary">Library</span>
          </span>
        </Link>

        {/* Desktop nav links — centered */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                {link.label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-x-1 -bottom-[13px] h-[2px] rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
          {/* Market mega dropdown */}
          <div
            className="relative"
            ref={marketDropdownRef}
            onMouseEnter={() => setMarketDropdownOpen(true)}
            onMouseLeave={() => setMarketDropdownOpen(false)}
          >
            <button
              onClick={() => setMarketDropdownOpen((v) => !v)}
              className={`relative flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
                isMarketActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              Market
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${marketDropdownOpen ? "rotate-180" : ""}`} />
              {isMarketActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-x-1 -bottom-[13px] h-[2px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
            <AnimatePresence>
              {marketDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-60 rounded-xl border border-border bg-card shadow-lg shadow-background/20 p-1.5"
                >
                  <Link
                    to="/market"
                    onClick={() => setMarketDropdownOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      location.pathname === "/market" ? "bg-secondary" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Token Market</p>
                      <p className="text-[10px] text-muted-foreground">Prices, charts & data</p>
                    </div>
                  </Link>
                  <Link
                    to="/forecasts"
                    onClick={() => setMarketDropdownOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      location.pathname === "/forecasts" ? "bg-secondary" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Forecasts</p>
                      <p className="text-[10px] text-muted-foreground">Predictions & voting</p>
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Desktop auth actions — right */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all hover:bg-secondary/50"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-foreground" /> : <Moon className="h-3.5 w-3.5 text-foreground" />}
          </button>

          {user ? (
            <>
              <NotificationDropdown />
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all hover:bg-secondary/50"
                  aria-label="Admin"
                >
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              )}
              <Link
                to="/submit"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-secondary/50"
              >
                <Plus className="h-3 w-3" />
                Submit
              </Link>
              <button
                onClick={handleSignOut}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              <User className="h-3 w-3" />
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden ml-auto flex items-center gap-1.5">
          {user && <NotificationDropdown />}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all hover:bg-secondary/50"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border/50 bg-background/98 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-3 flex flex-col gap-0.5">
              {/* Navigation links */}
              {mobileNavLinks.map((link) => {
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    }`}
                  >
                    <link.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                    {link.label}
                    {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}

              {/* Market section */}
              <div className="mt-1 mb-1">
                <p className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-semibold">Market</p>
                <Link
                  to="/market"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    location.pathname === "/market"
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <BarChart3 className={`h-4 w-4 ${location.pathname === "/market" ? "text-primary" : ""}`} />
                  Token Market
                  {location.pathname === "/market" && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </Link>
                <Link
                  to="/forecasts"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    location.pathname === "/forecasts"
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <TrendingUp className={`h-4 w-4 ${location.pathname === "/forecasts" ? "text-primary" : ""}`} />
                  Forecasts
                  {location.pathname === "/forecasts" && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </Link>
              </div>

              {/* Divider */}
              <div className="my-1.5 h-px bg-border/50" />

              {/* Actions */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => { toggleTheme(); setMobileOpen(false); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                {user ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all"
                      >
                        <Shield className="h-4 w-4" /> Admin
                      </Link>
                    )}
                    <Link
                      to="/submit"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all"
                    >
                      <Plus className="h-4 w-4" /> Submit Project
                    </Link>
                    <button
                      onClick={() => { handleSignOut(); setMobileOpen(false); }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                  >
                    <User className="h-4 w-4" /> Sign In
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
