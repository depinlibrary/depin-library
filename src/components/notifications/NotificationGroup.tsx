import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Notification } from "@/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

interface NotificationGroupProps {
  dateKey: string;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationGroup = ({ dateKey, notifications, onMarkRead, onDelete }: NotificationGroupProps) => {
  const getDateLabel = (dateKey: string) => {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateKey === format(today, "yyyy-MM-dd")) return "Today";
    if (dateKey === format(yesterday, "yyyy-MM-dd")) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  return (
    <div>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {getDateLabel(dateKey)}
      </h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
        <AnimatePresence>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};