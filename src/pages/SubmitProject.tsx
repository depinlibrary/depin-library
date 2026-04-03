import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, X } from "lucide-react";
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
import { useDynamicOptions } from "@/hooks/useDynamicOptions";

const SubmitProject = () => {
  const { categories: CATEGORIES, blockchains: BLOCKCHAINS } = useDynamicOptions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    category: "",
    blockchain: "",
    token: "",
    website: "",
    twitter_url: "",
    discord_url: ""
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

    let logoUrl: string | null = null;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.
      from("project-logos").
      upload(path, logoFile);
      if (uploadError) {
        toast.error(`Logo upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }
      const { data: publicData } = supabase.storage.from("project-logos").getPublicUrl(path);
      logoUrl = publicData.publicUrl;
    }

    const { error } = await supabase.from("project_submissions").insert({
      submitter_id: user.id,
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      category: form.category,
      blockchain: form.blockchain,
      token: form.token.trim(),
      website: form.website.trim(),
      twitter_url: form.twitter_url.trim(),
      discord_url: form.discord_url.trim(),
      logo_url: logoUrl
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
            <Button onClick={() => navigate("/auth")} className="mt-4">Sign In</Button>
          </div>
        </div>
      </div>);

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

            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6">
              {/* Basic Info */}
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

              {/* Logo Upload */}
              <div>
                <Label className="text-foreground mb-2 block">Project Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ?
                  <div className="relative">
                      <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-xl border border-border object-cover" />
                      <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">

                        <X className="h-3 w-3" />
                      </button>
                    </div> :

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">

                      <Upload className="h-5 w-5" />
                    </button>
                  }
                  <div className="text-sm text-muted-foreground">
                    <p>Upload a logo image</p>
                    <p className="text-xs">PNG, JPG, or SVG. Max 2MB.</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleFileChange}
                    className="hidden" />

                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Token Symbol</Label>
                  <Input value={form.token} onChange={(e) => update("token", e.target.value)} placeholder="e.g. HNT" className="mt-1" />
                </div>
                <div>
                  <Label className="text-foreground">Website</Label>
                  <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://..." className="mt-1" />
                </div>
              </div>

              {/* Social Media */}
              <div className="border-t border-border pt-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  
                  Social Media
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground">Twitter / X</Label>
                    <Input value={form.twitter_url} onChange={(e) => update("twitter_url", e.target.value)} placeholder="https://x.com/project" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-foreground">Discord</Label>
                    <Input value={form.discord_url} onChange={(e) => update("discord_url", e.target.value)} placeholder="https://discord.gg/..." className="mt-1" />
                  </div>
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
    </div>);

};

export default SubmitProject;