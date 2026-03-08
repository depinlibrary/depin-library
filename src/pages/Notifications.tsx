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

  // Memoize expensive operations
  const { filteredNotifications, unreadCount, notificationTypes, groupedNotifications, sortedDateKeys } = useMemo(() => {
    const filtered = notifications.filter((n) => {
      if (filter === "unread" && n.is_read) return false;
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      return true;
    });

    const unread = notifications.filter((n) => !n.is_read).length;
    const types = [...new Set(notifications.map((n) => n.type))];

    // Group notifications by date
    const grouped: Record<string, Notification[]> = {};
    filtered.forEach((n) => {
      const dateKey = format(new Date(n.created_at), "yyyy-MM-dd");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(n);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return {
      filteredNotifications: filtered,
      unreadCount: unread,
      notificationTypes: types,
      groupedNotifications: grouped,
      sortedDateKeys: sortedKeys,
    };
  }, [notifications, filter, typeFilter]);

  // Memoized handlers
  const handleMarkRead = (id: string) => markRead.mutate(id);
  const handleDelete = (id: string) => deleteNotification.mutate(id);
  const handleFilterChange = (newFilter: "all" | "unread") => setFilter(newFilter);
  const handleTypeFilterChange = (type: string) => setTypeFilter(type);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 pt-28 pb-16 max-w-2xl">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
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
        <NotificationFilters
          filter={filter}
          typeFilter={typeFilter}
          notificationTypes={notificationTypes}
          onFilterChange={handleFilterChange}
          onTypeFilterChange={handleTypeFilterChange}
        />

        {/* Notifications list */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-16" />
              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <NotificationEmpty filter={filter} />
        ) : (
          <div className="space-y-6" role="feed" aria-live="polite" aria-label="Notifications">
            {sortedDateKeys.map((dateKey) => (
              <NotificationGroup
                key={dateKey}
                dateKey={dateKey}
                notifications={groupedNotifications[dateKey]}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};


export default Notifications;
