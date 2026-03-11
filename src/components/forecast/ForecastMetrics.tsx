import { motion } from "framer-motion";
import { Activity, GitBranch, Twitter, History, Lock, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  items: { label: string; value: string; trend?: "up" | "down" | "neutral" }[];
  locked?: boolean;
  delay?: number;
}

function MetricCard({ icon, title, items, locked, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</h3>
        {locked && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="h-3 w-3" /> Coming Soon
          </span>
        )}
      </div>
      <div className="p-5">
        {locked ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-2">
              <Lock className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground">Data will be available after forecast resolution</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground font-['Space_Grotesk']">{item.value}</span>
                  {item.trend === "up" && <TrendingUp className="h-3 w-3 text-primary" />}
                  {item.trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
                  {item.trend === "neutral" && <Minus className="h-3 w-3 text-muted-foreground" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ForecastMetricsProps {
  isEnded: boolean;
  projectAName: string;
  projectBName?: string | null;
}

export default function ForecastMetrics({ isEnded, projectAName, projectBName }: ForecastMetricsProps) {
  // Mock data — will be replaced with real API data when integrations are added
  const onChainData = isEnded
    ? [
        { label: "Wallet Growth (30d)", value: "+12.4%", trend: "up" as const },
        { label: "Tx Volume (30d)", value: "1.2M", trend: "up" as const },
        { label: "Active Addresses", value: "34.2K", trend: "neutral" as const },
        { label: "TVL Change", value: "-3.1%", trend: "down" as const },
      ]
    : [];

  const devData = isEnded
    ? [
        { label: "GitHub Commits (30d)", value: "147", trend: "up" as const },
        { label: "Contributors", value: "23", trend: "neutral" as const },
        { label: "PRs Merged", value: "38", trend: "up" as const },
        { label: "Code Frequency", value: "High", trend: "up" as const },
      ]
    : [];

  const socialData = isEnded
    ? [
        { label: "Twitter Mentions", value: "2.4K", trend: "up" as const },
        { label: "Sentiment Score", value: "72/100", trend: "up" as const },
        { label: "Reddit Activity", value: "Medium", trend: "neutral" as const },
        { label: "News Articles", value: "18", trend: "up" as const },
      ]
    : [];

  const historicalData = isEnded
    ? [
        { label: "Similar Projects Avg Growth", value: "+18.3%", trend: "up" as const },
        { label: "Category Benchmark", value: "+9.7%", trend: "up" as const },
        { label: `${projectAName} vs Avg`, value: "+8.6%", trend: "up" as const },
        { label: "Prediction Accuracy", value: "67%", trend: "neutral" as const },
      ]
    : [];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Forecast Resolution Metrics
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          icon={<Activity className="h-3.5 w-3.5 text-primary" />}
          title="On-Chain Metrics"
          items={onChainData}
          locked={!isEnded}
          delay={0.05}
        />
        <MetricCard
          icon={<GitBranch className="h-3.5 w-3.5 text-accent" />}
          title="Developer Activity"
          items={devData}
          locked={!isEnded}
          delay={0.1}
        />
        <MetricCard
          icon={<Twitter className="h-3.5 w-3.5 text-neon-blue" />}
          title="Social Sentiment"
          items={socialData}
          locked={!isEnded}
          delay={0.15}
        />
        <MetricCard
          icon={<History className="h-3.5 w-3.5 text-neon-green" />}
          title="Historical Comparison"
          items={historicalData}
          locked={!isEnded}
          delay={0.2}
        />
      </div>
    </div>
  );
}
