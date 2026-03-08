import { useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { Bell, ArrowLeft, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  Notification,
} from "@/hooks/useNotifications";
import NotificationPreferencesDialog from "@/components/NotificationPreferencesDialog";
import { NotificationGroup } from "@/components/notifications/NotificationGroup";
import { NotificationFilters } from "@/components/notifications/NotificationFilters";
import { NotificationEmpty } from "@/components/notifications/NotificationEmpty";

const Notifications = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-16 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread" && n.is_read) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const notificationTypes = [...new Set(notifications.map((n) => n.type))];

  // Group notifications by date
  const groupedNotifications: Record<string, Notification[]> = {};
  filteredNotifications.forEach((n) => {
    const dateKey = format(new Date(n.created_at), "yyyy-MM-dd");
    if (!groupedNotifications[dateKey]) groupedNotifications[dateKey] = [];
    groupedNotifications[dateKey].push(n);
  });

  const sortedDateKeys = Object.keys(groupedNotifications).sort((a, b) => b.localeCompare(a));

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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 pt-28 pb-16 max-w-2xl">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground font-['Space_Grotesk']">Notifications</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                className="gap-1.5"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </Button>
            )}
            <NotificationPreferencesDialog />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 rounded-lg border border-border p-1">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === "unread"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread
            </button>
          </div>

          {notificationTypes.length > 1 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {notificationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {notificationTypeLabels[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
        ) : (
          <div className="space-y-6">
            {sortedDateKeys.map((dateKey) => (
              <div key={dateKey}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {getDateLabel(dateKey)}
                </h2>
                <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  <AnimatePresence>
                    {groupedNotifications[dateKey].map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`relative group px-4 py-4 transition-colors ${
                          notification.is_read ? "bg-transparent" : "bg-primary/5"
                        }`}
                      >
                        {notification.link ? (
                          <Link
                            to={notification.link}
                            onClick={() => !notification.is_read && markRead.mutate(notification.id)}
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
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markRead.mutate(notification.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteNotification.mutate(notification.id);
                            }}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

const NotificationContent = ({ notification }: { notification: Notification }) => (
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

export default Notifications;
