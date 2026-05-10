import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAvatar } from "@/hooks/useAvatar";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  Sun,
  Moon,
  User,
  Camera,
  Pencil,
  Check,
  LogOut,
  Briefcase,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import NotificationDropdown from "@/components/NotificationDropdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePoints, COST_PER_PROMPT } from "@/hooks/usePoints";
import OutOfPointsDialog from "@/components/points/OutOfPointsDialog";
import PointsBadge from "@/components/points/PointsBadge";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

const SAMPLE_PROMPTS = [
  "Analyze Helium's tokenomics and network growth",
  "Compare the infrastructure of top DePIN projects",
  "What are the risks of investing in IoTeX?",
  "Explain the revenue model of Hivemapper",
];

const NAV_LINKS = [
  { to: "/", label: "Overview" },
  { to: "/explore", label: "Explore" },
  { to: "/market", label: "Market" },
  { to: "/compare", label: "Compare" },
  { to: "/ai-analysis", label: "AI Analysis" },
];

const AIAnalysis = () => {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { avatarUrl, displayName, uploading, uploadAvatar, updateDisplayName } = useAvatar();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Profile dropdown state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showOutOfPoints, setShowOutOfPoints] = useState(false);
  const { spend } = usePoints();

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth?mode=login&redirect=/ai-analysis");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const createNewSession = async (initialPrompt?: string) => {
    if (initialPrompt) {
      const res = await spend(COST_PER_PROMPT, "ai_analysis_prompt");
      if (!res.ok) {
        setShowOutOfPoints(true);
        return;
      }
    }
    const id = crypto.randomUUID();
    const newSession: ChatSession = {
      id,
      title: initialPrompt?.slice(0, 40) || "New Analysis",
      messages: [],
      createdAt: new Date(),
    };
    if (initialPrompt) {
      newSession.messages.push({
        id: crypto.randomUUID(),
        role: "user",
        content: initialPrompt,
        timestamp: new Date(),
      });
      newSession.messages.push({
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "AI analysis is not yet connected. This is a preview of the chat interface. When enabled, I'll provide deep analysis of DePIN projects, tokenomics, infrastructure, and market trends.",
        timestamp: new Date(),
      });
    }
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(id);
    setInputValue("");
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!activeSession) {
      await createNewSession(inputValue.trim());
      return;
    }
    const res = await spend(COST_PER_PROMPT, "ai_analysis_prompt");
    if (!res.ok) {
      setShowOutOfPoints(true);
      return;
    }
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "AI analysis is not yet connected. This is a preview of the chat interface.",
      timestamp: new Date(),
    };
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [...s.messages, userMsg, aiMsg],
              title:
                s.messages.length === 0
                  ? inputValue.trim().slice(0, 40)
                  : s.title,
            }
          : s
      )
    );
    setInputValue("");
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Custom Header — matches Compare page */}
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
          {/* Right side */}
          <div className="flex-1 flex items-center justify-end px-4 gap-1.5">
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-all hover:bg-secondary/50"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-foreground" /> : <Moon className="h-3.5 w-3.5 text-foreground" />}
            </button>
            <PointsBadge />
            <NotificationDropdown />
            {/* Profile avatar dropdown */}
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
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar — fixed with nav links + chat sessions */}
        <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-r border-border bg-card/30 fixed top-14 left-0 bottom-0 overflow-hidden">
          {/* Nav links */}
          <div className="px-3 pt-3 pb-2 space-y-0.5 border-b border-border/50">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                  link.to === "/ai-analysis"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* New analysis button */}
          <div className="p-3 border-b border-border/50">
            <Button
              onClick={() => {
                setActiveSessionId(null);
                setInputValue("");
              }}
              variant="outline"
              className="w-full justify-start gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              New Analysis
            </Button>
          </div>

          {/* Chat sessions list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-xs text-muted-foreground">
                  No conversations yet
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`group w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    activeSessionId === session.id
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-[260px]">
          {/* Messages or Welcome */}
          <div className="flex-1 overflow-y-auto">
            {!activeSession || activeSession.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center max-w-lg"
                >
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <BrainCircuit className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-2 font-['Space_Grotesk']">
                    DePIN AI Analysis
                  </h1>
                  <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                    Ask me anything about DePIN projects — tokenomics,
                    infrastructure, market trends, investment risks, and more.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => createNewSession(prompt)}
                        className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-card/80 hover:shadow-sm"
                      >
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          {prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {activeSession.messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <BrainCircuit className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 text-foreground border border-border/50"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border/50 p-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary/30 transition-colors">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about any DePIN project..."
                  className="min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent p-2 text-sm focus-visible:ring-0 focus-visible:outline-none"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
                AI analysis is in preview. Responses are not yet connected to a model.
              </p>
            </div>
          </div>
        </div>
      </div>
      <OutOfPointsDialog open={showOutOfPoints} onOpenChange={setShowOutOfPoints} />
    </div>
  );
};

export default AIAnalysis;
