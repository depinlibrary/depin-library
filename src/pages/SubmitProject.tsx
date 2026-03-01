import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const CATEGORIES = ["Wireless", "Storage", "Compute", "Sensors", "Energy", "Mapping", "AI", "Mobility", "CDN", "VPN"];
const BLOCKCHAINS = ["Solana", "Ethereum", "Polygon", "Cosmos", "IoTeX", "Polkadot", "Arbitrum", "Filecoin", "Arweave", "Custom"];

const SubmitProject = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    category: "",
    blockchain: "",
    token: "",
    website: "",
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (!form.category || !form.blockchain) {
      toast.error("Please select a category and blockchain");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("project_submissions").insert({
      submitter_id: user.id,
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      category: form.category,
      blockchain: form.blockchain,
      token: form.token.trim(),
      website: form.website.trim(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Project submitted for review! We'll review it shortly.");
      navigate("/");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center pt-16">
          <div className="text-center">
            <span className="mb-4 block text-4xl">🔒</span>
            <p className="text-foreground font-medium">Sign in to submit a project</p>
            <Button onClick={() => navigate("/auth")} className="mt-4">
              Sign In
            </Button>
          </div>
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

        <div className="container relative mx-auto max-w-2xl px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Submit a DePIN Project</h1>
            <p className="mb-8 text-muted-foreground">
              Know a DePIN project that's missing? Submit it and we'll review it for the library.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6">
              <div>
                <Label className="text-foreground">Project Name *</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="e.g. Helium" className="mt-1" />
              </div>
              <div>
                <Label className="text-foreground">Tagline *</Label>
                <Input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} required placeholder="One-liner about the project" className="mt-1" />
              </div>
              <div>
                <Label className="text-foreground">Description *</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} required placeholder="What does this project do? How does it work?" className="mt-1 min-h-[120px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Category *</Label>
                  <Select value={form.category} onValueChange={(v) => update("category", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Blockchain *</Label>
                  <Select value={form.blockchain} onValueChange={(v) => update("blockchain", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {BLOCKCHAINS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Token Symbol</Label>
                  <Input value={form.token} onChange={(e) => update("token", e.target.value)} placeholder="e.g. HNT" className="mt-1" />
                </div>
                <div>
                  <Label className="text-foreground">Website</Label>
                  <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." className="mt-1" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Submitting..." : "Submit for Review"}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SubmitProject;
