import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Submission = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  blockchain: string;
  token: string;
  website: string;
  status: string;
  created_at: string;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
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

  useEffect(() => {
    if (!isAdmin) return;
    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from("project_submissions")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false });
      if (!error) setSubmissions(data || []);
    };
    fetchSubmissions();
  }, [isAdmin, filter]);

  const handleAction = async (submission: Submission, action: "approved" | "rejected") => {
    if (action === "approved") {
      // Create the project
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

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Submission ${action}`);
      setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
    }
  };

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

        <div className="container relative mx-auto max-w-4xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="mb-8 text-muted-foreground">Review and manage project submissions</p>

            {/* Filter tabs */}
            <div className="mb-6 flex gap-2">
              {(["pending", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all ${
                    filter === s
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "pending" && <Clock className="mr-1.5 inline h-3.5 w-3.5" />}
                  {s === "approved" && <Check className="mr-1.5 inline h-3.5 w-3.5" />}
                  {s === "rejected" && <X className="mr-1.5 inline h-3.5 w-3.5" />}
                  {s}
                </button>
              ))}
            </div>

            {/* Submissions list */}
            {submissions.length === 0 ? (
              <div className="rounded-xl border border-border bg-card py-16 text-center">
                <p className="text-muted-foreground">No {filter} submissions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border bg-card p-6"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{sub.name}</h3>
                        <p className="text-sm text-muted-foreground">{sub.tagline}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {sub.category}
                        </span>
                        <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {sub.blockchain}
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{sub.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-text-dim">
                        {sub.token && <span>Token: {sub.token}</span>}
                        {sub.website && (
                          <a href={sub.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> Website
                          </a>
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
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
