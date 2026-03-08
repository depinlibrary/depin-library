import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotificationPreferences";
import { Skeleton } from "@/components/ui/skeleton";

const PREF_ITEMS = [
  { key: "forecast_result" as const, label: "Forecast Results", desc: "When a forecast you voted on ends and results are available" },
  { key: "forecast_vote" as const, label: "Forecast Votes", desc: "When someone votes on a forecast you created" },
  { key: "forecast_comment_reply" as const, label: "Comment Replies", desc: "When someone replies to your forecast comment" },
  { key: "forecast_comment_like" as const, label: "Comment Likes", desc: "When someone likes your forecast comment" },
  { key: "forecast_new_comment" as const, label: "New Forecast Comments", desc: "When someone comments on a forecast you created" },
  { key: "review_like" as const, label: "Review Likes", desc: "When someone likes your project review" },
];

const NotificationPreferencesDialog = () => {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-['Space_Grotesk']">Notification Preferences</DialogTitle>
          <DialogDescription>Choose which notifications you'd like to receive.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          ) : (
            PREF_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={prefs?.[item.key] ?? true}
                  onCheckedChange={(checked) => update.mutate({ [item.key]: checked })}
                  disabled={update.isPending}
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationPreferencesDialog;
