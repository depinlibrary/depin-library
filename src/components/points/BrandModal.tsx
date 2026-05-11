import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
}

const BrandModal = ({ open, onClose, children, className, dismissible = true }: BrandModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, dismissible]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <button
            aria-label="Close"
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            onClick={() => dismissible && onClose()}
          />

          {/* Sheet/Card */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className={cn(
              "relative w-full max-w-md mx-auto",
              "rounded-t-3xl sm:rounded-3xl",
              "bg-gradient-to-b from-card via-card to-card/95",
              "border border-border/60 sm:border-border/80",
              "shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.35),0_0_0_1px_hsl(var(--border))]",
              "overflow-hidden",
              className
            )}
          >
            {/* Top accent glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-72 rounded-full bg-primary/25 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            </div>

            {dismissible && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="relative px-5 sm:px-7 pt-6 pb-6 sm:pt-8 sm:pb-7">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BrandModal;
