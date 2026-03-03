import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowRightLeft, Sparkles, Database, AlertTriangle, Shield, TrendingUp, Zap, Loader2, Flame, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
  const { toast } = useToast();
  const navigate = useNavigate();

  const [projectAId, setProjectAId] = useState<string>("");
  const [projectBId, setProjectBId] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState("");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const projectA = useMemo(() => projects?.find((p) => p.id === projectAId), [projects, projectAId]);
  const projectB = useMemo(() => projects?.find((p) => p.id === projectBId), [projects, projectBId]);

  // Fetch popular comparisons from cache
  const { data: popularComparisons } = useQuery({
    queryKey: ["popular-comparisons"],
    queryFn: async () => {
      const { data, error } = await supabase.
      from("project_comparisons").
      select("project_a_id, project_b_id, comparison_type, created_at, ai_response").
      eq("comparison_type", "standard").
      order("created_at", { ascending: false }).
      limit(6);
      if (error) throw error;
      return data || [];
    }
  });

  const popularWithNames = useMemo(() => {
    if (!popularComparisons || !projects) return [];
    return popularComparisons.map((c: any) => {
      const a = projects.find((p) => p.id === c.project_a_id);
      const b = projects.find((p) => p.id === c.project_b_id);
      if (!a || !b) return null;
      return { ...c, projectA: a, projectB: b };
    }).filter(Boolean);
  }, [popularComparisons, projects]);

  const handlePopularClick = (aId: string, bId: string) => {
    setProjectAId(aId);
    setProjectBId(bId);
    setUserPrompt("");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      <div className="gradient-radial-top fixed inset-0 pointer-events-none" />
      <Navbar />
      <main className="relative pt-24 pb-16 px-4 max-w-5xl mx-auto flex-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-4">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI Comparison Agent</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-['Space_Grotesk'] mb-2">
            Compare <span className="text-primary text-glow">DePIN</span> Projects
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Select two projects for AI-powered analysis of strengths, risks, and long-term outlook.
          </p>
        </motion.div>

        {/* Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 mb-6">
          
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end mb-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Project A</label>
              <Select value={projectAId} onValueChange={setProjectAId}>
                <SelectTrigger className="bg-secondary border-border focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {(projects || []).map((p) =>
                  <SelectItem key={p.id} value={p.id} disabled={p.id === projectBId}>
                      <span className="flex items-center gap-2">
                        {p.logo_url ?
                      <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded object-contain" /> :

                      <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>
                      }
                        {p.name}
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleSwap}
                disabled={!projectAId && !projectBId}
                className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center transition-colors hover:bg-primary/10 hover:border-primary/30 disabled:opacity-50 disabled:pointer-events-none"
                title="Swap projects">
                
                <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Project B</label>
              <Select value={projectBId} onValueChange={setProjectBId}>
                <SelectTrigger className="bg-secondary border-border focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {(projects || []).map((p) =>
                  <SelectItem key={p.id} value={p.id} disabled={p.id === projectAId}>
                      <span className="flex items-center gap-2">
                        {p.logo_url ?
                      <img src={p.logo_url} alt={p.name} className="w-5 h-5 rounded object-contain" /> :

                      <span className="w-5 h-5 flex items-center justify-center text-sm">{p.logo_emoji}</span>
                      }
                        {p.name}
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Custom Question (optional)</label>
            <Textarea
              placeholder="e.g. Which one has better long-term growth potential?"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="bg-secondary border-border resize-none h-20 focus-visible:ring-0 focus-visible:ring-offset-0" />
            
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzing || !projectAId || !projectBId || loadingProjects}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            
            {analyzing ?
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> :

            <><Sparkles className="w-4 h-4 mr-2" /> Analyze</>
            }
          </Button>
        </motion.div>

        {/* Popular Comparisons */}
        {!result && popularWithNames.length > 0 &&
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8">
          
            <h2 className="text-sm font-semibold font-['Space_Grotesk'] text-muted-foreground mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" /> Popular Comparisons
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {popularWithNames.map((c: any, i: number) =>
            <button
              key={i}
              onClick={() => handlePopularClick(c.project_a_id, c.project_b_id)}
              className="group rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5">
              
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{c.projectA.logo_emoji}</span>
                    <span className="text-xs font-medium text-foreground truncate">{c.projectA.name}</span>
                    <ArrowRightLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-base">{c.projectB.logo_emoji}</span>
                    <span className="text-xs font-medium text-foreground truncate">{c.projectB.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {(c.ai_response as any)?.summary?.slice(0, 100) || "View comparison"}...
                  </p>
                  <span className="text-[10px] text-primary mt-2 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
                    Load this comparison →
                  </span>
                </button>
            )}
            </div>
          </motion.div>
        }

        {/* Results */}
        <AnimatePresence>
          {result &&
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4">
            
              {/* Header badges */}
              <div className="flex items-center gap-3 flex-wrap">
                {isCached ?
              <Badge className="bg-secondary text-secondary-foreground border border-border gap-1">
                    <Database className="w-3 h-3" /> Cached Analysis
                  </Badge> :

              <Badge className="bg-primary/10 text-primary border border-primary/30 gap-1">
                    <Sparkles className="w-3 h-3" /> AI Generated
                  </Badge>
              }
                {createdAt &&
              <span className="text-xs text-muted-foreground">
                    Generated {new Date(createdAt).toLocaleDateString()}
                  </span>
              }
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold font-['Space_Grotesk'] mb-2 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" /> Summary
                </h2>
                <p className="text-secondary-foreground leading-relaxed">{result.summary}</p>
              </div>

              {/* Strengths */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold font-['Space_Grotesk'] mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" /> {projectA?.name || "Project A"} Strengths
                  </h3>
                  <ul className="space-y-2">
                    {result.project_a_strengths.map((s, i) =>
                  <li key={i} className="flex items-start gap-2 text-sm text-secondary-foreground">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        {s}
                      </li>
                  )}
                  </ul>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold font-['Space_Grotesk'] mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent" /> {projectB?.name || "Project B"} Strengths
                  </h3>
                  <ul className="space-y-2">
                    {result.project_b_strengths.map((s, i) =>
                  <li key={i} className="flex items-start gap-2 text-sm text-secondary-foreground">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        {s}
                      </li>
                  )}
                  </ul>
                </div>
              </div>

              {/* Risks */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold font-['Space_Grotesk'] mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Risks
                </h3>
                <ul className="space-y-2">
                  {result.risks.map((r, i) =>
                <li key={i} className="flex items-start gap-2 text-sm text-secondary-foreground">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      {r}
                    </li>
                )}
                </ul>
              </div>

              {/* Outlook */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold font-['Space_Grotesk'] mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Long-Term Outlook
                </h3>
                <p className="text-sm text-secondary-foreground leading-relaxed">{result.long_term_outlook}</p>
              </div>

              {/* Conclusion */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h3 className="text-sm font-semibold font-['Space_Grotesk'] mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Conclusion
                </h3>
                <p className="text-sm text-secondary-foreground leading-relaxed">{result.conclusion}</p>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center italic pt-2">
                ⚠️ This analysis is AI-generated and not financial advice. Always do your own research.
              </p>
            </motion.div>
          }
        </AnimatePresence>
      </main>

      {/* Auth Required Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-['Space_Grotesk']">
               Sign In Required
            </DialogTitle>
            <DialogDescription>
              You need to be signed in to use the AI comparison agent. Sign in or create an account to start analyzing DePIN projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAuthDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => navigate("/auth?redirect=/compare")} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>);

};

export default CompareProjects;