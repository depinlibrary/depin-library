import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const notificationTypeLabels: Record<string, string> = {
  forecast_comment_reply: "Comment Reply",
  forecast_comment_like: "Comment Like",
  forecast_new_comment: "New Comment",
  review_like: "Review Like",
  price_alert: "Price Alert",
  forecast_result: "Forecast Result",
  forecast_vote: "Forecast Vote",
};

interface NotificationFiltersProps {
  filter: "all" | "unread";
  typeFilter: string;
  notificationTypes: string[];
  onFilterChange: (filter: "all" | "unread") => void;
  onTypeFilterChange: (type: string) => void;
}

export const NotificationFilters = ({
  filter,
  typeFilter,
  notificationTypes,
  onFilterChange,
  onTypeFilterChange,
}: NotificationFiltersProps) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="flex items-center gap-2 rounded-lg border border-border p-1">
      <button
        onClick={() => onFilterChange("all")}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          filter === "all"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={filter === "all"}
      >
        All
      </button>
      <button
        onClick={() => onFilterChange("unread")}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          filter === "unread"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={filter === "unread"}
      >
        Unread
      </button>
    </div>

    {notificationTypes.length > 1 && (
      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
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
);