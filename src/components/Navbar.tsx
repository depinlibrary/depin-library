import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAvatar } from "@/hooks/useAvatar";
import { LogOut, Plus, User, Shield, Menu, X, Sun, Moon, ChevronDown, BarChart3, TrendingUp, Compass, GitCompare, Briefcase, Home, Zap, ArrowRight, LineChart, Camera, Pencil, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef, useCallback } from "react";
import NotificationDropdown from "@/components/NotificationDropdown";

const SignInButton = () => {
  const [glowing, setGlowing] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setGlowing(false), 10000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      animate={glowing ? { boxShadow: ["0 0 0px hsl(var(--primary) / 0)", "0 0 12px hsl(var(--primary) / 0.4)", "0 0 0px hsl(var(--primary) / 0)"] } : { boxShadow: "0 0 0px hsl(var(--primary) / 0)" }}
      transition={glowing ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5 }}
      className="rounded-lg"
    >
      <Link
        to="/auth"
        className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
        <User className="h-3.5 w-3.5" />
        Sign In
        <ArrowRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
      </Link>
    </motion.div>
  );
};

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { avatarUrl, displayName, uploading, uploadAvatar, updateDisplayName } = useAvatar();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isExploreActive = location.pathname === "/explore";
  const isMarketActive = location.pathname === "/market" || location.pathname === "/forecasts" || location.pathname === "/portfolio";

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
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const exploreDropdownRef = useRef<HTMLDivElement>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(e.target as Node)) {
        setMarketDropdownOpen(false);
      }
      if (exploreDropdownRef.current && !exploreDropdownRef.current.contains(e.target as Node)) {
        setExploreDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
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
    { to: "/compare", label: "Compare" },
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
                <div className="absolute left-1/2 top-full mt-3 z-50" style={{ marginLeft: '-170px' }}>
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-[340px] rounded-xl border border-border bg-card shadow-xl shadow-background/30 overflow-hidden"
                  >
                  {/* Header */}
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/50">Market Hub</p>
                  </div>

                  {/* Links */}
                  <div className="px-2 pb-2 space-y-0.5">
                    <Link
                      to="/market"
                      onClick={() => setMarketDropdownOpen(false)}
                      className={`group/item flex items-center gap-3 rounded-lg px-3 py-3 transition-all ${
                        location.pathname === "/market"
                          ? "bg-primary/8 border border-primary/15"
                          : "hover:bg-secondary/50 border border-transparent"
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                        location.pathname === "/market" ? "bg-primary/15" : "bg-secondary group-hover/item:bg-primary/10"
                      }`}>
                        <BarChart3 className={`h-4 w-4 ${location.pathname === "/market" ? "text-primary" : "text-muted-foreground group-hover/item:text-primary"} transition-colors`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">Token Market</p>
                          {location.pathname === "/market" && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">Active</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Live prices, sparklines & market cap data</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/item:text-muted-foreground transition-all group-hover/item:translate-x-0.5" />
                    </Link>

                    <Link
                      to="/forecasts"
                      onClick={() => setMarketDropdownOpen(false)}
                      className={`group/item flex items-center gap-3 rounded-lg px-3 py-3 transition-all ${
                        location.pathname === "/forecasts"
                          ? "bg-primary/8 border border-primary/15"
                          : "hover:bg-secondary/50 border border-transparent"
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                        location.pathname === "/forecasts" ? "bg-primary/15" : "bg-secondary group-hover/item:bg-primary/10"
                      }`}>
                        <TrendingUp className={`h-4 w-4 ${location.pathname === "/forecasts" ? "text-primary" : "text-muted-foreground group-hover/item:text-primary"} transition-colors`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">Forecasts</p>
                          {location.pathname === "/forecasts" && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">Active</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Community predictions, voting & accuracy</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/item:text-muted-foreground transition-all group-hover/item:translate-x-0.5" />
                    </Link>

                    <Link
                      to="/portfolio"
                      onClick={() => setMarketDropdownOpen(false)}
                      className={`group/item flex items-center gap-3 rounded-lg px-3 py-3 transition-all ${
                        location.pathname === "/portfolio"
                          ? "bg-primary/8 border border-primary/15"
                          : "hover:bg-secondary/50 border border-transparent"
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                        location.pathname === "/portfolio" ? "bg-primary/15" : "bg-secondary group-hover/item:bg-primary/10"
                      }`}>
                        <LineChart className={`h-4 w-4 ${location.pathname === "/portfolio" ? "text-primary" : "text-muted-foreground group-hover/item:text-primary"} transition-colors`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-semibold text-foreground">Portfolio Tracker</p>
                          {location.pathname === "/portfolio" && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">Active</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Track holdings, alerts & performance</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover/item:text-muted-foreground transition-all group-hover/item:translate-x-0.5" />
                    </Link>
                  </div>

                  {/* Footer with quick action */}
                  <div className="border-t border-border px-4 py-2.5 flex items-center justify-between bg-secondary/20">
                    <span className="text-[10px] text-muted-foreground">Track DePIN tokens in real time</span>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-primary">
                      <Zap className="h-3 w-3" />
                      Live
                    </div>
                  </div>
                </motion.div>
                </div>
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
              {/* Profile avatar dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 border border-primary/30 transition-all hover:bg-primary/25 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 overflow-hidden"
                  aria-label="Profile menu"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAvatar(file);
                    e.target.value = "";
                  }}
                />
                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-border bg-card shadow-xl shadow-background/30 overflow-hidden"
                    >
                      {/* User info with avatar */}
                      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                        <div className="relative group/avatar shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 overflow-hidden flex items-center justify-center">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <User className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                          >
                            <Camera className="h-3.5 w-3.5 text-foreground" />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          {editingName ? (
                            <form
                              className="flex items-center gap-1"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                await updateDisplayName(nameInput);
                                setEditingName(false);
                              }}
                            >
                              <input
                                autoFocus
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value.slice(0, 50))}
                                onKeyDown={(e) => { if (e.key === "Escape") setEditingName(false); }}
                                className="w-full bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                                maxLength={50}
                              />
                              <button type="submit" className="shrink-0 p-0.5 rounded hover:bg-primary/15 transition-colors">
                                <Check className="h-3 w-3 text-primary" />
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-1 group/name">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {displayName || user.email?.split("@")[0]}
                              </p>
                              <button
                                onClick={() => { setNameInput(displayName || ""); setEditingName(true); }}
                                className="shrink-0 p-0.5 rounded opacity-0 group-hover/name:opacity-100 hover:bg-secondary/50 transition-all"
                              >
                                <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{uploading ? "Uploading…" : user.email}</p>
                        </div>
                      </div>
                      <div className="py-1.5 px-1.5">
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
                        >
                          <User className="h-3.5 w-3.5" />
                          My Profile
                        </Link>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
                          >
                            <Shield className="h-3.5 w-3.5" />
                            Admin Dashboard
                          </Link>
                        )}
                        <Link
                          to="/portfolio"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
                        >
                          <Briefcase className="h-3.5 w-3.5" />
                          Portfolio
                        </Link>
                        <Link
                          to="/submit"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Submit Project
                        </Link>
                      </div>
                      <div className="border-t border-border/50 py-1.5 px-1.5">
                        <button
                          onClick={() => { handleSignOut(); setProfileDropdownOpen(false); }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <SignInButton />
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
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all"
                    >
                      <User className="h-4 w-4" /> My Profile
                    </Link>
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
                      to="/portfolio"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all"
                    >
                      <Briefcase className="h-4 w-4" /> Portfolio
                    </Link>
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
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Link
                      to="/auth"
                      onClick={() => setMobileOpen(false)}
                      className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                      <User className="h-4 w-4" />
                      Sign In
                      <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                    </Link>
                  </motion.div>
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
