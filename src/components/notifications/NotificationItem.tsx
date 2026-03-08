import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { Notification } from "@/hooks/useNotifications";
import { NotificationContent } from "./NotificationContent";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationItem = ({ notification, onMarkRead, onDelete }: NotificationItemProps) => {
  const handleMarkRead = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(notification.id);
  };

  const handleMarkReadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkRead(notification.id);
  };

  const itemContent = (
    <>
      <NotificationContent notification={notification} />
      
      {/* Actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <button
            onClick={handleMarkReadClick}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Mark as read"
            aria-label="Mark notification as read"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete notification"
          aria-label="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <span 
          className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary"
          aria-label="Unread notification"
        />
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative group px-4 py-4 transition-colors ${
        notification.is_read ? "bg-transparent" : "bg-primary/5"
      }`}
    >
      {notification.link ? (
        <Link
          to={notification.link}
          onClick={handleMarkRead}
          className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
        >
          {itemContent}
        </Link>
      ) : (
        <div 
          onClick={handleMarkRead}
          className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleMarkRead();
            }
          }}
        >
          {itemContent}
        </div>
      )}
    </motion.div>
  );
};