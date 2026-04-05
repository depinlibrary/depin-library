import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import type { VoteHistoryItem } from "@/hooks/useUserPredictionStats";
import { format, subDays, startOfDay, isSameDay } from "date-fns";

interface Props {
  history: VoteHistoryItem[];
  totalVotes: number;
  correctVotes: number;
  incorrectVotes: number;
}

const COLORS = {
  yes: "hsl(var(--primary))",
  no: "hsl(var(--destructive))",
  correct: "hsl(142, 71%, 45%)",
  pending: "hsl(var(--muted-foreground))",
  bar: "hsl(var(--primary))",
};

const ProfileActivityCharts = ({ history, totalVotes, correctVotes, incorrectVotes }: Props) => {
  // Vote distribution data
  const voteDistribution = useMemo(() => {
    const yes = history.filter(h => h.vote === "yes").length;
    const no = history.filter(h => h.vote === "no").length;
    if (yes === 0 && no === 0) return [];
    return [
      { name: "Yes", value: yes, fill: COLORS.yes },
      { name: "No", value: no, fill: COLORS.no },
    ];
  }, [history]);

  // Accuracy over time (cumulative)
  const accuracyOverTime = useMemo(() => {
    const resolved = history
      .filter(h => h.is_ended && h.was_correct !== null)
      .sort((a, b) => new Date(a.voted_at).getTime() - new Date(b.voted_at).getTime());

    if (resolved.length < 2) return [];

    let correct = 0;
    let total = 0;
    return resolved.map(item => {
      total++;
      if (item.was_correct) correct++;
      return {
        date: format(new Date(item.voted_at), "MMM d"),
        accuracy: Math.round((correct / total) * 100),
        votes: total,
      };
    });
  }, [history]);

  // Weekly activity (last 8 weeks)
  const weeklyActivity = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfDay(subDays(now, i * 7 + 6));
      const weekEnd = startOfDay(subDays(now, i * 7));
      const count = history.filter(h => {
        const d = startOfDay(new Date(h.voted_at));
        return d >= weekStart && d <= weekEnd;
      }).length;
      weeks.push({
        label: format(weekStart, "MMM d"),
        count,
      });
    }
    return weeks;
  }, [history]);

  // Best streak
  const bestStreak = useMemo(() => {
    const resolved = history
      .filter(h => h.is_ended && h.was_correct !== null)
      .sort((a, b) => new Date(a.voted_at).getTime() - new Date(b.voted_at).getTime());

    let max = 0;
    let current = 0;
    for (const item of resolved) {
      if (item.was_correct) {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    }
    return max;
  }, [history]);

  if (totalVotes === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Vote Distribution */}
      {voteDistribution.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Vote Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-[100px] h-[100px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={voteDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {voteDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {voteDistribution.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.fill }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {item.value} <span className="text-xs font-normal text-muted-foreground">({Math.round((item.value / totalVotes) * 100)}%)</span>
                    </span>
                  </div>
                ))}
                <div className="pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Best Streak</span>
                    <span className="text-sm font-semibold text-primary">{bestStreak}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voting Activity */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Voting Activity</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} votes`, "Votes"]}
                />
                <Bar dataKey="count" fill={COLORS.bar} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Accuracy Over Time */}
      {accuracyOverTime.length >= 2 && (
        <Card className="border-border/50 sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Accuracy Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={accuracyOverTime}>
                  <defs>
                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.correct} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.correct} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Accuracy"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke={COLORS.correct}
                    strokeWidth={2}
                    fill="url(#accuracyGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfileActivityCharts;
