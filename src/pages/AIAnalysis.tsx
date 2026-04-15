import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

const AIAnalysis = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth?mode=login&redirect=/ai-analysis");
    }
  }, [user, loading, navigate]);

  const createNewSession = (initialPrompt?: string) => {
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
      // Simulate AI response placeholder
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

  const handleSend = () => {
    if (!inputValue.trim()) return;
    if (!activeSession) {
      createNewSession(inputValue.trim());
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`border-r border-border bg-card/50 flex flex-col transition-all duration-300 shrink-0 ${
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-[280px]"
          }`}
        >
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
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toggle sidebar button */}
          <div className="p-2 border-b border-border/50 flex items-center gap-2">
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-secondary/50 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground">
              {activeSession ? activeSession.title : "AI Analysis"}
            </span>
          </div>

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
    </div>
  );
};

export default AIAnalysis;
