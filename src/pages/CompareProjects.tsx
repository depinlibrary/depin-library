import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowRightLeft, Sparkles, Database, AlertTriangle, Shield, TrendingUp, Zap, Loader2, Flame, LogIn, Plus, Clock, MessageSquare, Sun, Moon, User, Bell, Camera, Pencil, Check, LogOut, Briefcase } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useNavigate, Link } from "react-router-dom";

import NotificationDropdown from "@/components/NotificationDropdown";
import { useTheme } from "@/contexts/ThemeContext";
import { useAvatar } from "@/hooks/useAvatar";
import ProjectLogo from "@/components/ProjectLogo";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

type ComparisonResult = {
  summary: string;
  project_a_strengths: string[];
  project_b_strengths: string[];
  risks: string[];
  long_term_outlook: string;
  conclusion: string;
};

const CompareProjects = () => {
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { avatarUrl, displayName, uploading, uploadAvatar, updateDisplayName } = useAvatar();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const [projectAId, setProjectAId] = useState<string>("");
  const [projectBId, setProjectBId] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const a = params.get("a");
    const b = params.get("b");
    if (a) setProjectAId(a);
    if (b) setProjectBId(b);
  }, []);

  const projectA = useMemo(() => projects?.find((p) => p.id === projectAId), [projects, projectAId]);
  const projectB = useMemo(() => projects?.find((p) => p.id === projectBId), [projects, projectBId]);

  const { data: allComparisons = [] } = useQuery({
    queryKey: ["all-comparisons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_comparisons")
        .select("id, project_a_id, project_b_id, comparison_type, created_at, ai_response")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: recentComparisons = [] } = useQuery({
    queryKey: ["recent-comparisons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_comparisons")
        .select("id, project_a_id, project_b_id, comparison_type, created_at, ai_response")
        .eq("comparison_type", "standard")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    }
  });

  const historyWithNames = useMemo(() => {
    if (!allComparisons || !projects) return [];
    return allComparisons.map((c: any) => {
      const a = projects.find((p) => p.id === c.project_a_id);
      const b = projects.find((p) => p.id === c.project_b_id);
      if (!a || !b) return null;
      return { ...c, projectA: a, projectB: b };
    }).filter(Boolean);
  }, [allComparisons, projects]);

  const recentWithNames = useMemo(() => {
    if (!recentComparisons || !projects) return [];
    return recentComparisons.map((c: any) => {
      const a = projects.find((p) => p.id === c.project_a_id);
      const b = projects.find((p) => p.id === c.project_b_id);
      if (!a || !b) return null;
      return { ...c, projectA: a, projectB: b };
    }).filter(Boolean);
  }, [recentComparisons, projects]);

  const handleHistoryClick = (comp: any) => {
    setProjectAId(comp.project_a_id);
    setProjectBId(comp.project_b_id);
    setUserPrompt("");
    setActiveHistoryId(comp.id);
    const aiResponse = comp.ai_response as ComparisonResult;
    if (aiResponse) {
      setResult(aiResponse);
      setIsCached(true);
      setCreatedAt(comp.created_at);
    }
  };

  const handleNewComparison = () => {
    setProjectAId("");
    setProjectBId("");
    setUserPrompt("");
    setResult(null);
    setIsCached(false);
    setCreatedAt("");
    setActiveHistoryId(null);
  };

  const handleSwap = () => {
    setProjectAId(projectBId);
    setProjectBId(projectAId);
  };

  const handleAnalyze = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    if (!projectAId || !projectBId) {
      toast({ title: "Select projects", description: "Please select two projects to compare.", variant: "destructive" });
      return;
    }
    if (projectAId === projectBId) {
      toast({ title: "Different projects", description: "Please select two different projects.", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("compare-projects", {
        body: { project_a_id: projectAId, project_b_id: projectBId, user_prompt: userPrompt || undefined }
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      setResult(data.result);
      setIsCached(data.cached);
      setCreatedAt(data.created_at);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  // Group history by relative date
  const groupedHistory = useMemo(() => {
    const groups: { label: string; items: any[] }[] = [];
    const now = new Date();

    const todayItems: any[] = [];
    const weekItems: any[] = [];
    const olderItems: any[] = [];

    historyWithNames.forEach((c: any) => {
      const date = new Date(c.created_at);
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) todayItems.push(c);
      else if (diffDays < 7) weekItems.push(c);
      else olderItems.push(c);
    });

    if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
    if (weekItems.length > 0) groups.push({ label: "This Week", items: weekItems });
    if (olderItems.length > 0) groups.push({ label: "Earlier", items: olderItems });

    return groups;
  }, [historyWithNames]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Custom Compare Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="flex h-14 items-center">
          {/* Logo area — matches sidebar width */}
          <div className="hidden md:flex items-center w-[260px] shrink-0 px-4 border-r border-border/50 h-full">
            <Link to="/" className="flex items-center gap-0">
              <img src={logoImg} alt="DePIN Library" className="h-10 w-10 object-contain" />
              <span className="text-base font-semibold tracking-tight text-foreground">
                DePIN Library
              </span>
            </Link>
          </div>
          {/* Mobile logo */}
          <div className="flex md:hidden items-center px-4">
            <Link to="/" className="flex items-center gap-0">
              <img src={logoImg} alt="DePIN Library" className="h-9 w-9 object-contain" />
              <span className="text-sm font-semibold tracking-tight text-foreground">DePIN Library</span>
            </Link>
          </div>
          {/* Right side — theme toggle, notifications, profile */}
          <div className="flex-1 flex items-center justify-end px-4 gap-1.5">
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
                {/* Profile avatar dropdown — hover */}
                <div
                  className="relative"
                  ref={profileDropdownRef}
                  onMouseEnter={() => setProfileDropdownOpen(true)}
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
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
                        className="absolute right-0 top-full pt-2 z-50 w-56"
                      >
                        <div className="rounded-xl border border-border bg-card shadow-xl shadow-background/30 overflow-hidden">
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
                                    className="w-full bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-border"
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
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="rounded-lg">
                <Link
                  to="/auth"
                  className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
                >
                  <User className="h-4 w-4" />
                  <span>Sign In</span>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* ── Sidebar — fixed, visible for all users ── */}
        <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-r border-border bg-card/30 fixed top-14 left-0 bottom-0 overflow-hidden">
          {/* Nav links */}
          <div className="px-3 pt-3 pb-2 space-y-0.5 border-b border-border/50">
            {[
              { to: "/", label: "Overview" },
              { to: "/explore", label: "Explore" },
              { to: "/forecasts", label: "Predictions" },
              { to: "/market", label: "Market" },
              { to: "/compare", label: "Compare" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                  window.location.pathname === link.to
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {user && (
            <>
              {/* Sidebar header */}
              <div className="flex items-center px-4 h-10 border-b border-border/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comparison History</span>
              </div>

              {/* History list */}
              <div className="flex-1 overflow-y-auto">
                {groupedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                      <MessageSquare className="h-6 w-6 text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">No comparisons yet</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Select two projects to get started</p>
                    </div>
                  ) : (
                    groupedHistory.map((group) => (
                      <div key={group.label}>
                        <div className="px-4 pt-4 pb-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">{group.label}</p>
                        </div>
                        <div className="px-2 space-y-0.5">
                          {group.items.map((c: any) => (
                            <button
                              key={c.id}
                              onClick={() => handleHistoryClick(c)}
                              className={`w-full text-left rounded-lg px-3 py-2.5 transition-all ${
                                activeHistoryId === c.id
                                  ? "bg-secondary border border-border"
                                  : "hover:bg-secondary/30 border border-transparent"
                              }`}
                            >
                               <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 shrink-0">
                                  <div className="h-6 w-6 rounded-md overflow-hidden bg-secondary flex items-center justify-center">
                                    {c.projectA.logo_url ? (
                                      <img src={c.projectA.logo_url} alt="" className="h-6 w-6 object-contain" />
                                    ) : (
                                      <span className="text-xs">{c.projectA.logo_emoji}</span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-muted-foreground/50 font-medium">vs</span>
                                  <div className="h-6 w-6 rounded-md overflow-hidden bg-secondary flex items-center justify-center">
                                    {c.projectB.logo_url ? (
                                      <img src={c.projectB.logo_url} alt="" className="h-6 w-6 object-contain" />
                                    ) : (
                                      <span className="text-xs">{c.projectB.logo_emoji}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-foreground truncate leading-tight">
                                    {c.projectA.name} vs {c.projectB.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            </>
          )}
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto md:ml-[260px]">
          <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />
          <div className="gradient-radial-top fixed inset-0 pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 mb-3">
                <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">AI Comparison</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-['Space_Grotesk'] text-foreground">
                Compare DePIN Projects
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Select two projects for AI-powered analysis of strengths, risks, and outlook.
              </p>
            </motion.div>

            {/* Selection Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden mb-8"
            >
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                  {/* Project A */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Project A</label>
                    <Select value={projectAId} onValueChange={setProjectAId}>
                      <SelectTrigger className="bg-secondary/50 border-border h-11">
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(projects || []).map((p) => (
                          <SelectItem key={p.id} value={p.id} disabled={p.id === projectBId}>
                            <span className="flex items-center gap-2">
                              {p.logo_url ? (
                                <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded object-contain" />
                              ) : (
                                <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>
                              )}
                              {p.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {projectA && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                        <ProjectLogo logoUrl={projectA.logo_url} logoEmoji={projectA.logo_emoji} name={projectA.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{projectA.name}</p>
                          <p className="text-xs text-muted-foreground">{projectA.category} · {projectA.blockchain}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Swap */}
                  <div className="flex justify-center md:pb-2">
                    <button
                      onClick={handleSwap}
                      disabled={!projectAId && !projectBId}
                      className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center transition-colors hover:bg-secondary/80 disabled:opacity-50 disabled:pointer-events-none"
                      title="Swap projects"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Project B */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Project B</label>
                    <Select value={projectBId} onValueChange={setProjectBId}>
                      <SelectTrigger className="bg-secondary/50 border-border h-11">
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(projects || []).map((p) => (
                          <SelectItem key={p.id} value={p.id} disabled={p.id === projectAId}>
                            <span className="flex items-center gap-2">
                              {p.logo_url ? (
                                <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded object-contain" />
                              ) : (
                                <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>
                              )}
                              {p.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {projectB && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                        <ProjectLogo logoUrl={projectB.logo_url} logoEmoji={projectB.logo_emoji} name={projectB.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{projectB.name}</p>
                          <p className="text-xs text-muted-foreground">{projectB.category} · {projectB.blockchain}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom question + analyze */}
              <div className="border-t border-border bg-secondary/20 p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Ask a custom question (optional)... e.g. Which has better long-term growth potential?"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      className="bg-card border-border resize-y h-11 min-h-[44px] py-2.5 text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing || !projectAId || !projectBId || loadingProjects}
                    className="h-11 px-6 bg-foreground text-background hover:bg-foreground/90 font-semibold shrink-0"
                  >
                    {analyzing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Analyze</>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Recent Comparisons (shown when no result) */}
            {!result && recentWithNames.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5" /> Recent Comparisons
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentWithNames.map((c: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleHistoryClick(c)}
                      className="group rounded-xl border border-border bg-card/60 p-4 text-left transition-all hover:bg-secondary/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {c.projectA.logo_url ? (
                          <img src={c.projectA.logo_url} alt={c.projectA.name} className="w-5 h-5 rounded object-contain" />
                        ) : (
                          <span className="text-base">{c.projectA.logo_emoji}</span>
                        )}
                        <span className="text-xs font-medium text-foreground truncate">{c.projectA.name}</span>
                        <span className="text-muted-foreground text-[10px]">vs</span>
                        {c.projectB.logo_url ? (
                          <img src={c.projectB.logo_url} alt={c.projectB.name} className="w-5 h-5 rounded object-contain" />
                        ) : (
                          <span className="text-base">{c.projectB.logo_emoji}</span>
                        )}
                        <span className="text-xs font-medium text-foreground truncate">{c.projectB.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {(c.ai_response as any)?.summary?.slice(0, 100) || "View comparison"}...
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Results */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {isCached ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Database className="w-3 h-3" /> Cached
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Sparkles className="w-3 h-3" /> AI Generated
                      </Badge>
                    )}
                    {createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="w-4 h-4 text-muted-foreground" />
                      <h2 className="text-base font-semibold text-foreground">Summary</h2>
                    </div>
                    <p className="text-sm text-secondary-foreground leading-relaxed">{result.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-border bg-card/80 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                          <Zap className="w-3 h-3 text-foreground" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">{projectA?.name || "Project A"}</h3>
                      </div>
                      <ul className="space-y-2.5">
                        {result.project_a_strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-secondary-foreground">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/80 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                          <Zap className="w-3 h-3 text-foreground" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">{projectB?.name || "Project B"}</h3>
                      </div>
                      <ul className="space-y-2.5">
                        {result.project_b_strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-secondary-foreground">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground/30 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <h3 className="text-sm font-semibold text-foreground">Risks</h3>
                    </div>
                    <ul className="space-y-2.5">
                      {result.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-secondary-foreground">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive/50 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-border bg-card/80 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Long-Term Outlook</h3>
                    </div>
                    <p className="text-sm text-secondary-foreground leading-relaxed">{result.long_term_outlook}</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-secondary/30 p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Conclusion</h3>
                    </div>
                    <p className="text-sm text-secondary-foreground leading-relaxed">{result.conclusion}</p>
                  </div>


                  {user && projectA && projectB && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
                      <h3 className="text-sm font-semibold text-foreground mb-2">Have a prediction based on this analysis?</h3>
                      <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                        Create a community forecast about {projectA.name} vs {projectB.name} and let others vote on the outcome.
                      </p>
                      <Button
                        onClick={() => {
                          const title = `${projectA?.name} vs ${projectB?.name}: ${result.conclusion.slice(0, 80)}${result.conclusion.length > 80 ? '...' : ''}`;
                          const desc = `Summary: ${result.summary}\n\nLong-term outlook: ${result.long_term_outlook}\n\nKey risks: ${result.risks.join('; ')}`;
                          sessionStorage.setItem('forecast_prefill', JSON.stringify({ title, description: desc }));
                          navigate(`/forecasts?create=true&a=${projectAId}&b=${projectBId}`);
                        }}
                        className="gap-2"
                      >
                        <TrendingUp className="w-4 h-4" /> Create Forecast
                      </Button>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground text-center pt-2">
                    This analysis is AI-generated and not financial advice. Always do your own research.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk']">Sign In Required</DialogTitle>
            <DialogDescription>
              Sign in to use the AI comparison agent and start analyzing DePIN projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAuthDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate(`/auth?redirect=/compare?a=${projectAId}&b=${projectBId}`)} className="bg-foreground text-background hover:bg-foreground/90">
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompareProjects;
