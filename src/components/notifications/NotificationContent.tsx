import { formatDistanceToNow } from "date-fns";
import { Notification } from "@/hooks/useNotifications";

interface NotificationContentProps {
  notification: Notification;
}

const notificationTypeLabels: Record<string, string> = {
  price_alert: "Price Alert",
};

export const NotificationContent = ({ notification }: NotificationContentProps) => (
  <div className="pr-16">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">
        {notificationTypeLabels[notification.type] || notification.type}
      </span>
    </div>
    <p className="text-sm font-medium text-foreground line-clamp-1">{notification.title}</p>
    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
    </p>
  </div>
);