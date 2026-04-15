import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Send,
  X,
  Sparkles,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIAnalysisSidebarProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
}

const QUICK_PROMPTS = [
  "Analyze this project's tokenomics",
  "What are the key risks?",
  "Summarize infrastructure strengths",
  "Compare with competitors",
];

const AIAnalysisSidebar = ({
  open,
  onClose,
  projectName,
  projectId,
}: AIAnalysisSidebarProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = (text?: string) => {
    const content = text || inputValue.trim();
    if (!content) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `AI analysis for ${projectName} is not yet connected. This is a preview of the chat interface. When enabled, I'll provide deep insights about this project.`,
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Reset messages when project changes
  useEffect(() => {
    setMessages([]);
    setInputValue("");
  }, [projectId]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[480px] border-l border-border bg-background flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    AI Analysis
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {projectName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  to="/ai-analysis"
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
                  title="Open full page"
                >
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                </Link>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {!user ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <BrainCircuit className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Sign in required
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Log in to use AI Analysis
                  </p>
                  <Link
                    to="/auth?mode=login"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Sign In
                  </Link>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <BrainCircuit className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Analyze {projectName}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-6 max-w-[280px]">
                    Ask questions about tokenomics, risks, infrastructure, or
                    anything else.
                  </p>
                  <div className="space-y-2 w-full max-w-[300px]">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSend(prompt)}
                        className="w-full flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-left text-xs text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
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

            {/* Input */}
            {user && (
              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-primary/30 transition-colors">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask about ${projectName}...`}
                    className="min-h-[40px] max-h-[80px] resize-none border-0 bg-transparent p-1 text-xs focus-visible:ring-0 focus-visible:outline-none"
                    rows={1}
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim()}
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-center text-[9px] text-muted-foreground/40 mt-1.5">
                  AI analysis preview — not yet connected
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIAnalysisSidebar;
