import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Clock, ExternalLink, Pencil, Save, Trash2, Upload, ImageIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProjectLogo from "@/components/ProjectLogo";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ManageCategories, ManageBlockchains } from "@/components/admin/ManageCategories";
import UsersList from "@/components/admin/UsersList";
import DeletionRequests from "@/components/admin/DeletionRequests";
import ManageSpotlight from "@/components/admin/ManageSpotlight";
import ManageForecasts from "@/components/admin/ManageForecasts";
import ManageHourlyForecasts from "@/components/admin/ManageHourlyForecasts";

import { useDynamicOptions } from "@/hooks/useDynamicOptions";

type Submission = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  blockchain: string;
  token: string;
  website: string;
  twitter_url: string;
  discord_url: string;
  logo_url: string | null;
  status: string;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: string;
  blockchain: string;
  token: string;
  website: string;
  twitter_url: string;
  discord_url: string;
  logo_url: string | null;
  logo_emoji: string;
  status: string;
  year_founded: number | null;
  coingecko_id: string | null;
  created_at: string;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories: CATEGORIES, blockchains: BLOCKCHAINS } = useDynamicOptions();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"projects" | "submissions" | "categories" | "users" | "deletion-requests" | "spotlight" | "forecasts" | "hourly">("projects");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [projectSearch, setProjectSearch] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      setLoading(false);
    };
    checkAdmin();
  }, [user]);

  // Fetch submissions
  useEffect(() => {
    if (!isAdmin || tab !== "submissions") return;
    const fetch = async () => {
      const { data } = await supabase
        .from("project_submissions")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false });
      setSubmissions(data || []);
    };
    fetch();
  }, [isAdmin, filter, tab]);

  // Fetch all projects
  useEffect(() => {
    if (!isAdmin || tab !== "projects") return;
    const fetch = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("name");
      setProjects((data as Project[]) || []);
    };
    fetch();
  }, [isAdmin, tab]);

  const handleAction = async (submission: Submission, action: "approved" | "rejected") => {
    if (action === "approved") {
      const slug = submission.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error: insertError } = await supabase.from("projects").insert({
        name: submission.name,
        slug,
        tagline: submission.tagline,
        description: submission.description,
        category: submission.category,
        blockchain: submission.blockchain,
        token: submission.token,
        website: submission.website,
        twitter_url: submission.twitter_url || "",
        discord_url: submission.discord_url || "",
        logo_url: submission.logo_url,
        status: "live",
        logo_emoji: "⬡",
      });
      if (insertError) {
        toast.error(`Failed to create project: ${insertError.message}`);
        return;
      }
    }

    const { error } = await supabase
      .from("project_submissions")
      .update({ status: action })
      .eq("id", submission.id);

    if (error) toast.error(error.message);
    else {
      toast.success(`Submission ${action}`);
      setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    }
  };

  const startEdit = (project: Project) => {
    setEditingId(project.id);
    setEditForm({ ...project });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setUploading(true);

    let logoUrl = editForm.logo_url;

    // Upload new logo if selected
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${editingId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("project-logos")
        .upload(path, logoFile, { upsert: true });
      if (uploadError) {
        toast.error(`Logo upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }
      const { data: publicData } = supabase.storage
        .from("project-logos")
        .getPublicUrl(path);
      logoUrl = publicData.publicUrl;
    }

    const { error } = await supabase.from("projects").update({
      name: editForm.name,
      tagline: editForm.tagline,
      description: editForm.description,
      category: editForm.category,
      blockchain: editForm.blockchain,
      token: editForm.token,
      website: editForm.website,
      twitter_url: editForm.twitter_url,
      discord_url: editForm.discord_url,
      logo_url: logoUrl,
      logo_emoji: editForm.logo_emoji,
      status: editForm.status,
      coingecko_id: editForm.coingecko_id || null,
    }).eq("id", editingId);

    // If coingecko_id was set, trigger a price fetch for this project
    if (!error && editForm.coingecko_id) {
      supabase.functions.invoke("fetch-token-prices", {
        body: { project_id: editingId },
      }).catch(() => {}); // fire-and-forget
    }

    setUploading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Project updated");
      setProjects((prev) => prev.map((p) => p.id === editingId ? { ...p, ...editForm, logo_url: logoUrl } as Project : p));
      cancelEdit();
    }
  };

  const deleteProject = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Project deleted");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filteredProjects = projectSearch
    ? projects.filter((p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
    : projects;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center pt-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-screen flex-col items-center justify-center pt-16">
          <span className="mb-4 text-5xl">🔒</span>
          <h1 className="text-xl font-semibold text-foreground">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have permission to view this page.</p>
          <Button onClick={() => navigate("/")} variant="outline" className="mt-4">Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative pt-24 pb-20">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="gradient-radial-top absolute inset-0" />

        <div className="container relative mx-auto max-w-5xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="mb-6 text-muted-foreground">Manage projects and review submissions</p>

            {/* Main tabs */}
            <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">
              {([
                { key: "projects", label: `All Projects (${projects.length})` },
                { key: "submissions", label: "Submissions" },
                { key: "forecasts", label: "Predictions" },
                { key: "hourly", label: "Hourly Predictions" },
                { key: "spotlight", label: "Spotlight" },
                { key: "deletion-requests", label: "Deletion Requests" },
                { key: "categories", label: "Categories & Blockchains" },
                { key: "users", label: "Users" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "submissions" && (
              <>
                <div className="mb-6 flex gap-2">
                  {(["pending", "approved", "rejected"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilter(s)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all ${
                        filter === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
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
                            {sub.logo_url && (
                              <img src={sub.logo_url} alt="" className="h-10 w-10 rounded-lg border border-border object-cover" />
                            )}
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
                            {sub.website && (
                              <a href={sub.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                <ExternalLink className="h-3 w-3" /> Website
                              </a>
                            )}
                            {sub.twitter_url && (
                              <a href={sub.twitter_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twitter/X</a>
                            )}
                            {sub.discord_url && (
                              <a href={sub.discord_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord</a>
                            )}
                            <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                          </div>
                          {filter === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleAction(sub, "rejected")}>
                                <X className="mr-1 h-3.5 w-3.5" /> Reject
                              </Button>
                              <Button size="sm" onClick={() => handleAction(sub, "approved")}>
                                <Check className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
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
                  <Input
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="space-y-3">
                  {filteredProjects.map((project) => (
                    <motion.div
                      key={project.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl border border-border bg-card"
                    >
                      {editingId === project.id ? (
                        /* Edit mode */
                        <div className="space-y-4 p-5">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Name</Label>
                              <Input value={editForm.name || ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Slug</Label>
                              <Input value={project.slug} disabled className="mt-1 opacity-50" />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Tagline</Label>
                            <Input value={editForm.tagline || ""} onChange={(e) => setEditForm((f) => ({ ...f, tagline: e.target.value }))} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <Textarea value={editForm.description || ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 min-h-[80px]" />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Category</Label>
                              <Select value={editForm.category || ""} onValueChange={(v) => setEditForm((f) => ({ ...f, category: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Blockchain</Label>
                              <Select value={editForm.blockchain || ""} onValueChange={(v) => setEditForm((f) => ({ ...f, blockchain: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {BLOCKCHAINS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Token</Label>
                              <Input value={editForm.token || ""} onChange={(e) => setEditForm((f) => ({ ...f, token: e.target.value }))} className="mt-1" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Website</Label>
                              <Input value={editForm.website || ""} onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Project Logo</Label>
                              <div className="mt-1 flex items-center gap-3">
                                {(logoPreview || editForm.logo_url) ? (
                                  <img
                                    src={logoPreview || editForm.logo_url || ""}
                                    alt="Logo"
                                    className="h-12 w-12 rounded-lg border border-border object-cover"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border bg-secondary">
                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => logoInputRef.current?.click()}
                                  >
                                    <Upload className="mr-1 h-3.5 w-3.5" />
                                    {editForm.logo_url || logoPreview ? "Change" : "Upload"}
                                  </Button>
                                  {(logoPreview || editForm.logo_url) && (
                                    <button
                                      type="button"
                                      className="text-xs text-destructive hover:underline"
                                      onClick={() => {
                                        setLogoFile(null);
                                        setLogoPreview(null);
                                        setEditForm((f) => ({ ...f, logo_url: null }));
                                      }}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                                <input
                                  ref={logoInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleLogoFileChange}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">Twitter / X</Label>
                              <Input value={editForm.twitter_url || ""} onChange={(e) => setEditForm((f) => ({ ...f, twitter_url: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Discord</Label>
                              <Input value={editForm.discord_url || ""} onChange={(e) => setEditForm((f) => ({ ...f, discord_url: e.target.value }))} className="mt-1" />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">CoinGecko ID</Label>
                              <Input value={editForm.coingecko_id || ""} onChange={(e) => setEditForm((f) => ({ ...f, coingecko_id: e.target.value || null }))} className="mt-1" placeholder="e.g. helium, filecoin" />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Status</Label>
                              <Select value={editForm.status || "live"} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="live">🟢 Live</SelectItem>
                                  <SelectItem value="testnet">🟡 Testnet</SelectItem>
                                  <SelectItem value="pending">🟠 Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Year Founded</Label>
                              <Input type="number" value={editForm.year_founded || ""} onChange={(e) => setEditForm((f) => ({ ...f, year_founded: e.target.value ? Number(e.target.value) : null }))} className="mt-1" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={cancelEdit} disabled={uploading}>Cancel</Button>
                            <Button size="sm" onClick={saveEdit} disabled={uploading}>
                              <Save className="mr-1 h-3.5 w-3.5" /> {uploading ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
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
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteProject(project.id, project.name)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
                <div className="rounded-xl border border-border bg-card p-5">
                  <ManageCategories />
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <ManageBlockchains />
                </div>
              </div>
            )}

            {tab === "users" && <UsersList />}

            {tab === "deletion-requests" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Forecast Deletion Requests</h3>
                <DeletionRequests />
              </div>
            )}

            {tab === "forecasts" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Manage Forecasts</h3>
                <ManageForecasts />
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
                <ManageHourlyForecasts />
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
