import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/hooks/useNotifications";

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: notifications = [], isLoading } = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-all hover:bg-secondary"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-hidden rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[11px] text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative group px-4 py-3 border-b border-border/50 last:border-b-0 transition-colors ${
                      notification.is_read ? "bg-transparent" : "bg-primary/5"
                    }`}
                  >
                    {notification.link ? (
                      <Link
                        to={notification.link}
                        onClick={() => handleNotificationClick(notification)}
                        className="block"
                      >
                        <NotificationContent notification={notification} />
                      </Link>
                    ) : (
                      <div onClick={() => !notification.is_read && markRead.mutate(notification.id)}>
                        <NotificationContent notification={notification} />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markRead.mutate(notification.id); }}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification.mutate(notification.id); }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 border-t border-border text-center text-xs font-medium text-primary hover:bg-secondary/50 transition-colors"
            >
              View all notifications
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationContent = ({ notification }: { notification: any }) => (
  <>
    <p className="text-xs font-medium text-foreground line-clamp-1 pr-8">{notification.title}</p>
    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
    <p className="text-[10px] text-muted-foreground/60 mt-1">
      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
    </p>
  </>
);

export default NotificationDropdown;
