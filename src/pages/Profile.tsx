import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate, Link } from "react-router-dom";
import { Trophy, Target, Clock, ThumbsUp, ThumbsDown, CheckCircle, XCircle, HelpCircle, BarChart3, TrendingUp, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useUserForecastStats } from "@/hooks/useUserForecastStats";
import { formatDistanceToNow } from "date-fns";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: stats, isLoading } = useUserForecastStats(user?.id);
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "pending">("all");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24 space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth?redirect=/profile" replace />;

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";

  const filteredHistory = stats?.history.filter((item) => {
    if (filter === "correct") return item.was_correct === true;
    if (filter === "incorrect") return item.was_correct === false;
    if (filter === "pending") return item.was_correct === null;
    return true;
  }) || [];

  const accuracyColor = (stats?.accuracy ?? 0) >= 60
    ? "text-green-500"
    : (stats?.accuracy ?? 0) >= 40
      ? "text-yellow-500"
      : "text-destructive";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">{displayName}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold text-foreground">{stats?.totalVotes ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Votes</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <Target className={`h-6 w-6 mx-auto mb-2 ${accuracyColor}`} />
                <p className={`text-3xl font-bold ${accuracyColor}`}>{stats?.accuracy ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-3xl font-bold text-green-500">{stats?.correctVotes ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Correct</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="pt-6 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold text-foreground">{stats?.pendingVotes ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Accuracy Visualization */}
        {!isLoading && stats && stats.totalVotes > 0 && (stats.correctVotes + stats.incorrectVotes) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Prediction Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-4 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all"
                    style={{ width: `${stats.accuracy}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{stats.correctVotes} correct</span>
                  <span>{stats.incorrectVotes} incorrect</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Voting History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  Voting History
                </CardTitle>
                <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-2 h-6">All</TabsTrigger>
                    <TabsTrigger value="correct" className="text-xs px-2 h-6">Correct</TabsTrigger>
                    <TabsTrigger value="incorrect" className="text-xs px-2 h-6">Wrong</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs px-2 h-6">Pending</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : filteredHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  {stats?.totalVotes === 0 ? "No forecast votes yet. Start voting on forecasts!" : "No votes match this filter."}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map((item, i) => {
                    const totalVotes = item.total_votes_yes + item.total_votes_no;
                    const yesPct = totalVotes > 0 ? Math.round((item.total_votes_yes / totalVotes) * 100) : 50;

                    return (
                      <motion.div
                        key={`${item.forecast_id}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Link
                          to={`/forecasts/${item.forecast_id}`}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors border border-border/30"
                        >
                          <span className="text-xl">{item.project_logo_emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.forecast_title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{item.project_name}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.voted_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant={item.vote === "yes" ? "default" : "destructive"}
                              className="text-[10px] px-2"
                            >
                              {item.vote === "yes" ? (
                                <><ThumbsUp className="h-3 w-3 mr-1" /> Yes</>
                              ) : (
                                <><ThumbsDown className="h-3 w-3 mr-1" /> No</>
                              )}
                            </Badge>
                            {item.was_correct === true && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {item.was_correct === false && (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            {item.was_correct === null && (
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
