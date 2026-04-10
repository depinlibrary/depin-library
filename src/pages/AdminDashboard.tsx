import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAvatar } from "@/hooks/useAvatar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Check, X, Clock, ExternalLink, Pencil, Save, Trash2, Upload, ImageIcon,
  LayoutDashboard, FileText, LineChart, Activity, Star, Shield, Layers,
  Users, Server, Sun, Moon, User, LogOut, Camera, Home, Compass, BarChart3,
  GitCompare,
} from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";
import UserAvatar from "@/components/UserAvatar";
import NotificationDropdown from "@/components/NotificationDropdown";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { ManageCategories, ManageBlockchains } from "@/components/admin/ManageCategories";
import UsersList from "@/components/admin/UsersList";
import DeletionRequests from "@/components/admin/DeletionRequests";
import ManageSpotlight from "@/components/admin/ManageSpotlight";
import ManagePredictions from "@/components/admin/ManagePredictions";
import ManageHourlyPredictions from "@/components/admin/ManageHourlyPredictions";
import ManageInfrastructure from "@/components/admin/ManageInfrastructure";
import logoImg from "@/assets/logo.png";
import { useDynamicOptions } from "@/hooks/useDynamicOptions";

type TabKey = "projects" | "submissions" | "categories" | "users" | "deletion-requests" | "spotlight" | "predictions" | "hourly" | "infrastructure";

type Submission = {
  id: string; name: string; tagline: string; description: string; category: string;
  blockchain: string; token: string; website: string; twitter_url: string; discord_url: string;
  logo_url: string | null; status: string; created_at: string;
};

type Project = {
  id: string; name: string; slug: string; tagline: string; description: string; category: string;
  blockchain: string; token: string; website: string; twitter_url: string; discord_url: string;
  logo_url: string | null; logo_emoji: string; status: string; year_founded: number | null;
  coingecko_id: string | null; created_at: string;
};

const sidebarTabs: { key: TabKey; label: string; icon: any }[] = [
  { key: "projects", label: "All Projects", icon: LayoutDashboard },
  { key: "submissions", label: "Submissions", icon: FileText },
  { key: "predictions", label: "Predictions", icon: LineChart },
  { key: "hourly", label: "Hourly Predictions", icon: Activity },
  { key: "spotlight", label: "Spotlight", icon: Star },
  { key: "infrastructure", label: "Infrastructure", icon: Server },
  { key: "deletion-requests", label: "Deletion Requests", icon: Trash2 },
  { key: "categories", label: "Categories", icon: Layers },
  { key: "users", label: "Users", icon: Users },
];

const sidebarLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/market", label: "Market", icon: BarChart3 },
  { to: "/compare", label: "Compare", icon: GitCompare },
  { to: "/portfolio", label: "Portfolio", icon: LayoutDashboard },
];

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { avatarUrl, displayName, uploading, uploadAvatar, updateDisplayName } = useAvatar();
  const navigate = useNavigate();
  const { categories: CATEGORIES, blockchains: BLOCKCHAINS } = useDynamicOptions();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("projects");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [projectSearch, setProjectSearch] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading2, setUploading2] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      setLoading(false);
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!isAdmin || tab !== "submissions") return;
    supabase.from("project_submissions").select("*").eq("status", filter)
      .order("created_at", { ascending: false }).then(({ data }) => setSubmissions(data || []));
  }, [isAdmin, filter, tab]);

  useEffect(() => {
    if (!isAdmin || tab !== "projects") return;
    supabase.from("projects").select("*").order("name").then(({ data }) => setProjects((data as Project[]) || []));
  }, [isAdmin, tab]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node))
        setProfileDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAction = async (submission: Submission, action: "approved" | "rejected") => {
    if (action === "approved") {
      const slug = submission.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error: insertError } = await supabase.from("projects").insert({
        name: submission.name, slug, tagline: submission.tagline, description: submission.description,
        category: submission.category, blockchain: submission.blockchain, token: submission.token,
        website: submission.website, twitter_url: submission.twitter_url || "", discord_url: submission.discord_url || "",
        logo_url: submission.logo_url, status: "live", logo_emoji: "⬡",
      });
      if (insertError) { toast.error(`Failed to create project: ${insertError.message}`); return; }
    }
    const { error } = await supabase.from("project_submissions").update({ status: action }).eq("id", submission.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Submission ${action}`);
      setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    }
  };

  const startEdit = (project: Project) => {
    setEditingId(project.id); setEditForm({ ...project }); setLogoFile(null); setLogoPreview(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); setLogoFile(null); setLogoPreview(null); };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    setLogoFile(file); setLogoPreview(URL.createObjectURL(file));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setUploading2(true);
    let logoUrl = editForm.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${editingId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("project-logos").upload(path, logoFile, { upsert: true });
      if (uploadError) { toast.error(`Logo upload failed: ${uploadError.message}`); setUploading2(false); return; }
      const { data: publicData } = supabase.storage.from("project-logos").getPublicUrl(path);
      logoUrl = publicData.publicUrl;
    }
    const { error } = await supabase.from("projects").update({
      name: editForm.name, tagline: editForm.tagline, description: editForm.description,
      category: editForm.category, blockchain: editForm.blockchain, token: editForm.token,
      website: editForm.website, twitter_url: editForm.twitter_url, discord_url: editForm.discord_url,
      logo_url: logoUrl, logo_emoji: editForm.logo_emoji, status: editForm.status,
      coingecko_id: editForm.coingecko_id || null,
    }).eq("id", editingId);
    if (!error && editForm.coingecko_id) {
      supabase.functions.invoke("fetch-token-prices", { body: { project_id: editingId } }).catch(() => {});
    }
    setUploading2(false);
    if (error) { toast.error(error.message); }
    else {
      toast.success("Project updated successfully");
      setProjects((prev) => prev.map((p) => p.id === editingId ? { ...p, ...editForm, logo_url: logoUrl } as Project : p));
      cancelEdit();
    }
  };

  const deleteProject = async (id: string, name: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`"${name}" deleted successfully`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filteredProjects = projectSearch
    ? projects.filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    : projects;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <span className="mb-4 text-5xl">🔒</span>
        <h1 className="text-xl font-semibold text-foreground">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don't have permission to view this page.</p>
        <Button onClick={() => navigate("/")} variant="outline" className="mt-4">Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="flex h-14 items-center">
          <div className="hidden md:flex items-center w-[240px] shrink-0 px-4 border-r border-border/50 h-full">
            <Link to="/" className="flex items-center gap-0">
              <img src={logoImg} alt="DePIN Library" className="h-10 w-10 object-contain" />
              <span className="text-base font-semibold tracking-tight text-foreground">DePIN Library</span>
            </Link>
          </div>
          <div className="flex md:hidden items-center px-4">
            <Link to="/" className="flex items-center gap-0">
              <img src={logoImg} alt="DePIN Library" className="h-9 w-9 object-contain" />
              <span className="text-sm font-semibold tracking-tight text-foreground">DePIN Library</span>
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-end px-4">
            <div className="flex items-center gap-1.5">
              <button onClick={toggleTheme} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all hover:bg-secondary/50" aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-foreground" /> : <Moon className="h-3.5 w-3.5 text-foreground" />}
              </button>
              <NotificationDropdown />
              <div className="relative" ref={profileDropdownRef}
                onMouseEnter={() => setProfileDropdownOpen(true)}
                onMouseLeave={() => setProfileDropdownOpen(false)}>
                <button onClick={() => setProfileDropdownOpen((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 border border-primary/30 transition-all hover:bg-primary/25 overflow-hidden">
                  {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover" /> : <User className="h-3.5 w-3.5 text-primary" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadAvatar(file); e.target.value = ""; }} />
                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }} transition={{ duration: 0.18 }}
                      className="absolute right-0 top-full pt-2 z-50 w-56">
                      <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                          <div className="relative group/avatar shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary/15 border border-primary/30 overflow-hidden flex items-center justify-center">
                              {avatarUrl ? <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <User className="h-4 w-4 text-primary" />}
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                              className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                              <Camera className="h-3.5 w-3.5 text-foreground" />
                            </button>
                          </div>
                          <div className="min-w-0 flex-1">
                            {editingName ? (
                              <form className="flex items-center gap-1" onSubmit={async (e) => { e.preventDefault(); await updateDisplayName(nameInput); setEditingName(false); }}>
                                <input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value.slice(0, 50))}
                                  onKeyDown={(e) => { if (e.key === "Escape") setEditingName(false); }}
                                  className="w-full bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-border" maxLength={50} />
                                <button type="submit" className="shrink-0 p-0.5 rounded hover:bg-primary/15"><Check className="h-3 w-3 text-primary" /></button>
                              </form>
                            ) : (
                              <div className="flex items-center gap-1 group/name">
                                <p className="text-xs font-semibold text-foreground truncate">{displayName || user.email?.split("@")[0]}</p>
                                <button onClick={() => { setNameInput(displayName || ""); setEditingName(true); }}
                                  className="shrink-0 p-0.5 rounded opacity-0 group-hover/name:opacity-100 hover:bg-secondary/50 transition-all">
                                  <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{user.email}</p>
                          </div>
                        </div>
                        <div className="border-t border-border/50 py-1.5 px-1.5">
                          <button onClick={async () => { await signOut(); setProfileDropdownOpen(false); }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-all">
                            <LogOut className="h-3.5 w-3.5" /> Sign Out
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-border bg-card/30 fixed top-14 left-0 bottom-0 overflow-y-auto">
          <div className="flex items-center px-4 h-12 border-b border-border/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Panel</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-2 py-2 space-y-0.5">
              {sidebarTabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    tab === t.key
                      ? "bg-primary/10 text-foreground border border-primary/15"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground border border-transparent"
                  }`}>
                  <t.icon className={`h-4 w-4 ${tab === t.key ? "text-primary" : ""}`} />
                  {t.label}
                  {tab === t.key && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
            <div className="my-2 mx-4 h-px bg-border/50" />
            <div className="px-4 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-1.5">Navigate</p>
            </div>
            <div className="px-2 space-y-0.5">
              {sidebarLinks.map((link) => (
                <Link key={link.to} to={link.to}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all border border-transparent">
                  <link.icon className="h-4 w-4" /> {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-border/50 p-2 space-y-0.5">
            <button onClick={async () => await signOut()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/40 transition-all">
              <UserAvatar avatarUrl={avatarUrl} displayName={displayName} size="sm" />
              <span className="text-foreground truncate flex-1 text-left">{displayName || user?.email?.split("@")[0] || "Admin"}</span>
              <LogOut className="h-4 w-4 text-destructive shrink-0" />
            </button>
          </div>
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm overflow-x-auto">
          <div className="flex gap-1 px-3 py-2">
            {sidebarTabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 md:ml-[240px] overflow-y-auto">
          <div className="relative pb-20 pt-2 md:pt-0">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="gradient-radial-top absolute inset-0" />
            <div className="relative px-4 md:px-6 pt-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="mb-1 text-2xl font-bold text-foreground">
                  {sidebarTabs.find((t) => t.key === tab)?.label || "Admin"}
                </h1>
                <p className="mb-6 text-sm text-muted-foreground">Manage your platform settings and content</p>

                {tab === "submissions" && (
                  <>
                    <div className="mb-6 flex gap-2">
                      {(["pending", "approved", "rejected"] as const).map((s) => (
                        <button key={s} onClick={() => setFilter(s)}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all ${
                            filter === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
                          }`}>
                          {s === "pending" && <Clock className="mr-1.5 inline h-3.5 w-3.5" />}
                          {s === "approved" && <Check className="mr-1.5 inline h-3.5 w-3.5" />}
                          {s === "rejected" && <X className="mr-1.5 inline h-3.5 w-3.5" />}
                          {s}
                        </button>
                      ))}
                    </div>
                    {submissions.length === 0 ? (
                      <div className="rounded-xl border border-border bg-card py-16 text-center">
                        <p className="text-muted-foreground">No {filter} submissions</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {submissions.map((sub) => (
                          <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
                            <div className="mb-3 flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {sub.logo_url && <img src={sub.logo_url} alt="" className="h-10 w-10 rounded-lg border border-border object-cover" />}
                                <div>
                                  <h3 className="text-lg font-semibold text-foreground">{sub.name}</h3>
                                  <p className="text-sm text-muted-foreground">{sub.tagline}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{sub.category}</span>
                                <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{sub.blockchain}</span>
                              </div>
                            </div>
                            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{sub.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {sub.token && <span>Token: {sub.token}</span>}
                                {sub.website && <a href={sub.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Website</a>}
                                <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                              </div>
                              {filter === "pending" && (
                                <div className="flex gap-2">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline"><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Submission</AlertDialogTitle>
                                        <AlertDialogDescription>Are you sure you want to reject "{sub.name}"?</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAction(sub, "rejected")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Reject</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm"><Check className="mr-1 h-3.5 w-3.5" /> Approve</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Approve Submission</AlertDialogTitle>
                                        <AlertDialogDescription>Approve "{sub.name}" and create it as a live project?</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAction(sub, "approved")}>Approve</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {tab === "projects" && (
                  <>
                    <div className="mb-4">
                      <Input placeholder="Search projects..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="max-w-sm" />
                    </div>
                    <div className="space-y-3">
                      {filteredProjects.map((project) => (
                        <motion.div key={project.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card">
                          {editingId === project.id ? (
                            <div className="space-y-4 p-5">
                              <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-muted-foreground">Name</Label><Input value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
                                <div><Label className="text-xs text-muted-foreground">Slug</Label><Input value={project.slug} disabled className="mt-1 opacity-50" /></div>
                              </div>
                              <div><Label className="text-xs text-muted-foreground">Tagline</Label><Input value={editForm.tagline || ""} onChange={(e) => setEditForm((f) => ({ ...f, tagline: e.target.value }))} className="mt-1" /></div>
                              <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={editForm.description || ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 min-h-[80px]" /></div>
                              <div className="grid grid-cols-3 gap-4">
                                <div><Label className="text-xs text-muted-foreground">Category</Label>
                                  <Select value={editForm.category || ""} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div><Label className="text-xs text-muted-foreground">Blockchain</Label>
                                  <Select value={editForm.blockchain || ""} onValueChange={(v) => setEditForm((f) => ({ ...f, blockchain: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>{BLOCKCHAINS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div><Label className="text-xs text-muted-foreground">Token</Label><Input value={editForm.token || ""} onChange={(e) => setEditForm((f) => ({ ...f, token: e.target.value }))} className="mt-1" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-muted-foreground">Website</Label><Input value={editForm.website || ""} onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))} className="mt-1" /></div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Project Logo</Label>
                                  <div className="mt-1 flex items-center gap-3">
                                    {(logoPreview || editForm.logo_url) ? (
                                      <img src={logoPreview || editForm.logo_url || ""} alt="Logo" className="h-12 w-12 rounded-lg border border-border object-cover" />
                                    ) : (
                                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border bg-secondary"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                                    )}
                                    <div className="flex flex-col gap-1">
                                      <Button type="button" size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                                        <Upload className="mr-1 h-3.5 w-3.5" /> {editForm.logo_url || logoPreview ? "Change" : "Upload"}
                                      </Button>
                                      {(logoPreview || editForm.logo_url) && (
                                        <button type="button" className="text-xs text-destructive hover:underline"
                                          onClick={() => { setLogoFile(null); setLogoPreview(null); setEditForm((f) => ({ ...f, logo_url: null })); }}>
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-muted-foreground">Twitter / X</Label><Input value={editForm.twitter_url || ""} onChange={(e) => setEditForm((f) => ({ ...f, twitter_url: e.target.value }))} className="mt-1" /></div>
                                <div><Label className="text-xs text-muted-foreground">Discord</Label><Input value={editForm.discord_url || ""} onChange={(e) => setEditForm((f) => ({ ...f, discord_url: e.target.value }))} className="mt-1" /></div>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div><Label className="text-xs text-muted-foreground">CoinGecko ID</Label><Input value={editForm.coingecko_id || ""} onChange={(e) => setEditForm((f) => ({ ...f, coingecko_id: e.target.value || null }))} className="mt-1" placeholder="e.g. helium, filecoin" /></div>
                                <div><Label className="text-xs text-muted-foreground">Status</Label>
                                  <Select value={editForm.status || "live"} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="live">🟢 Live</SelectItem>
                                      <SelectItem value="testnet">🟡 Testnet</SelectItem>
                                      <SelectItem value="pending">🟠 Pending</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div><Label className="text-xs text-muted-foreground">Year Founded</Label><Input type="number" value={editForm.year_founded || ""} onChange={(e) => setEditForm((f) => ({ ...f, year_founded: e.target.value ? Number(e.target.value) : null }))} className="mt-1" /></div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={uploading2}>Cancel</Button>
                                <Button size="sm" onClick={saveEdit} disabled={uploading2}>
                                  <Save className="mr-1 h-3.5 w-3.5" /> {uploading2 ? "Saving..." : "Save Changes"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 p-4">
                              <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground">{project.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{project.tagline}</p>
                              </div>
                              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{project.category}</span>
                              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{project.blockchain}</span>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(project)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                      <AlertDialogDescription>Are you sure you want to delete "{project.name}"? This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteProject(project.id, project.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}

                {tab === "categories" && (
                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-5"><ManageCategories /></div>
                    <div className="rounded-xl border border-border bg-card p-5"><ManageBlockchains /></div>
                  </div>
                )}

                {tab === "users" && <UsersList />}
                {tab === "infrastructure" && <ManageInfrastructure />}
                {tab === "deletion-requests" && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">Prediction Deletion Requests</h3>
                    <DeletionRequests />
                  </div>
                )}
                {tab === "predictions" && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">Manage Predictions</h3>
                    <ManagePredictions />
                  </div>
                )}
                {tab === "spotlight" && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="mb-4 text-lg font-semibold text-foreground">Manage Spotlight Projects</h3>
                    <ManageSpotlight />
                  </div>
                )}
                {tab === "hourly" && (
                  <div className="rounded-xl border border-border bg-card p-5">
                    <ManageHourlyPredictions />
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
