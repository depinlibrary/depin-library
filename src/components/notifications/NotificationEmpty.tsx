import { motion } from "framer-motion";
import { Bell } from "lucide-react";

interface NotificationEmptyProps {
  filter: "all" | "unread";
}

export const NotificationEmpty = ({ filter }: NotificationEmptyProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="rounded-xl border border-border bg-card p-12 text-center"
  >
    <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
    <h3 className="text-base font-semibold text-foreground mb-1">
      {filter === "unread" ? "No unread notifications" : "No notifications yet"}
    </h3>
    <p className="text-sm text-muted-foreground">
      {filter === "unread"
        ? "You're all caught up!"
        : "When you receive notifications, they'll appear here."}
    </p>
  </motion.div>
);