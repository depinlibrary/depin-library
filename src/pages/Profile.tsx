import { useState, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatar } from "@/hooks/useAvatar";
import { useUserForecastStats } from "@/hooks/useUserForecastStats";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotificationPreferences";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UserAvatar from "@/components/UserAvatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Camera, Check, X, TrendingUp, Target, Clock, BookmarkIcon,
  Bell, Mail, Shield, Award, BarChart3, CheckCircle2, XCircle, HelpCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { avatarUrl, displayName, uploading, uploadAvatar, updateDisplayName } = useAvatar();
  const { data: forecastStats, isLoading: statsLoading } = useUserForecastStats(user?.id);
  const { bookmarks } = useBookmarks();
  const { data: notifPrefs, isLoading: prefsLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleNameSave = async () => {
    const ok = await updateDisplayName(nameInput);
    if (ok) {
      toast.success("Display name updated");
      setEditingName(false);
    } else {
      toast.error("Failed to update name");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar(file).then(() => toast.success("Avatar updated"));
    }
    e.target.value = "";
  };

  const toggleNotifPref = (key: string, current: boolean) => {
    updatePrefs.mutate({ [key]: !current }, {
      onSuccess: () => toast.success("Preference updated"),
      onError: () => toast.error("Failed to update preference"),
    });
  };

  const notifOptions = [
    { key: "forecast_vote", label: "Forecast votes", desc: "When someone votes on your forecast", icon: TrendingUp },
    { key: "forecast_result", label: "Forecast results", desc: "When a forecast you voted on ends", icon: Target },
    { key: "forecast_new_comment", label: "New comments", desc: "Comments on your forecasts", icon: Bell },
    { key: "forecast_comment_reply", label: "Comment replies", desc: "Replies to your comments", icon: Mail },
    { key: "forecast_comment_like", label: "Comment likes", desc: "When someone likes your comment", icon: Award },
    { key: "review_like", label: "Review likes", desc: "When someone likes your review", icon: Award },
    { key: "price_alert", label: "Price alerts", desc: "Token price threshold alerts", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          <Card className="overflow-hidden border-border/50">
            <div className="h-24 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/5" />
            <CardContent className="relative px-6 pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
                {/* Avatar */}
                <div className="relative group">
                  <div className="h-20 w-20 rounded-full border-4 border-card bg-card overflow-hidden">
                    <UserAvatar avatarUrl={avatarUrl} displayName={displayName} size="lg" className="h-full w-full !rounded-none" />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="h-5 w-5 text-foreground" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0 pb-1">
                  {editingName ? (
                    <div className="flex items-center gap-2 max-w-xs">
                      <Input
                        autoFocus
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value.slice(0, 50))}
                        onKeyDown={(e) => { if (e.key === "Escape") setEditingName(false); if (e.key === "Enter") handleNameSave(); }}
                        maxLength={50}
                        className="h-8 text-sm"
                      />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleNameSave}><Check className="h-4 w-4 text-primary" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingName(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNameInput(displayName || ""); setEditingName(true); }}
                      className="text-xl font-bold text-foreground hover:text-primary transition-colors text-left"
                    >
                      {displayName || user.email?.split("@")[0]}
                    </button>
                  )}
                  <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Member since {format(new Date(user.created_at), "MMMM yyyy")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="w-full justify-start bg-card border border-border/50">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
              ) : (
                <>
                  <StatCard icon={TrendingUp} label="Total Votes" value={forecastStats?.totalVotes ?? 0} />
                  <StatCard icon={CheckCircle2} label="Correct" value={forecastStats?.correctVotes ?? 0} color="text-emerald-400" />
                  <StatCard icon={XCircle} label="Incorrect" value={forecastStats?.incorrectVotes ?? 0} color="text-destructive" />
                  <StatCard icon={Target} label="Accuracy" value={`${forecastStats?.accuracy ?? 0}%`} color="text-primary" />
                </>
              )}
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookmarkIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{bookmarks?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Bookmarked Projects</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{forecastStats?.pendingVotes ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Pending Forecasts</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Forecast Activity */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Recent Forecast Activity</CardTitle>
                <CardDescription>Your latest votes and their outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                  </div>
                ) : !forecastStats?.history?.length ? (
                  <div className="text-center py-8">
                    <HelpCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No forecast activity yet</p>
                    <Link to="/forecasts" className="text-xs text-primary hover:underline mt-1 inline-block">
                      Browse forecasts →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {forecastStats.history.slice(0, 15).map((item) => (
                      <Link
                        key={item.forecast_id + item.voted_at}
                        to={`/forecasts/${item.forecast_id}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                      >
                        <span className="text-lg shrink-0">{item.project_logo_emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {item.forecast_title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Voted <Badge variant={item.vote === "yes" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 ml-1">{item.vote.toUpperCase()}</Badge>
                            <span className="ml-2">{formatDistanceToNow(new Date(item.voted_at), { addSuffix: true })}</span>
                          </p>
                        </div>
                        {item.is_ended && (
                          <div className="shrink-0">
                            {item.was_correct === true && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                            {item.was_correct === false && <XCircle className="h-4 w-4 text-destructive" />}
                          </div>
                        )}
                        {!item.is_ended && (
                          <Clock className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Notification Preferences */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose which notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent>
                {prefsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifOptions.map((opt) => {
                      const val = (notifPrefs as any)?.[opt.key] ?? true;
                      return (
                        <div key={opt.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <opt.icon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{opt.label}</p>
                              <p className="text-xs text-muted-foreground">{opt.desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={val}
                            onCheckedChange={() => toggleNotifPref(opt.key, val)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm text-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <div>
                    <Label className="text-xs text-muted-foreground">User ID</Label>
                    <p className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}…</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) => (
  <Card className="border-border/50">
    <CardContent className="p-4 text-center">
      <Icon className={`h-5 w-5 mx-auto mb-2 ${color || "text-muted-foreground"}`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </CardContent>
  </Card>
);

export default Profile;
