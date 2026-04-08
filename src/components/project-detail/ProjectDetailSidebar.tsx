import { motion } from "framer-motion";
import { ExternalLink, Globe, Layers, Coins, Calendar, Activity, Star, Twitter, TrendingUp, TrendingDown, Minus } from "lucide-react";
import ProjectLogo from "@/components/ProjectLogo";
import type { Project } from "@/hooks/useProjects";
import type { TokenMarketData } from "@/hooks/useTokenMarketData";
import type { CoinDetail } from "@/hooks/useCoinDetail";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const statusColors: Record<string, string> = {
  live: "bg-neon-green/15 text-neon-green border-neon-green/30",
  testnet: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  development: "bg-muted text-muted-foreground border-border",
};

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "—";
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMarketCap(cap: number | null): string {
  if (cap === null || cap === undefined) return "—";
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  if (cap >= 1e3) return `$${(cap / 1e3).toFixed(2)}K`;
  return `$${cap.toFixed(2)}`;
}

interface Props {
  project: Project;
  marketData: TokenMarketData | null | undefined;
  ratingsData: any;
  coinDetail?: CoinDetail | null;
}

export default function ProjectDetailSidebar({ project, marketData, ratingsData, coinDetail }: Props) {
  const overallRating = ratingsData?.averages?.overall;
  const change24h = marketData?.price_change_24h;
  const isPositive = (change24h ?? 0) >= 0;

  return (
    <div className="space-y-4">
      {/* Header card: Logo, Name, Badges, Social, Description */}
      <motion.div {...fadeUp} className="rounded-xl border border-border bg-card p-5">
        {/* Name + Rating row */}
        <div className="flex items-start gap-3 mb-3">
          <ProjectLogo logoUrl={project.logo_url} logoEmoji={project.logo_emoji} name={project.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground leading-tight">{project.name}</h1>
              {ratingsData?.averages?.count > 0 && overallRating && (
                <span className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  <Star className="h-3 w-3 fill-primary" />
                  {overallRating.toFixed(1)}
                </span>
              )}
            </div>
            {/* Category / Blockchain badges */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                {project.category}
              </span>
              <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                {project.blockchain}
              </span>
              <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusColors[project.status] || statusColors.development}`}>
                ● {project.status}
              </span>
            </div>
          </div>
        </div>

        {/* Social links row */}
        <div className="flex gap-2 mb-4">
          {project.website && (
            <a href={project.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
              title="Website">
              <Globe className="h-4 w-4" />
            </a>
          )}
          {project.twitter_url && (
            <a href={project.twitter_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
              title="Twitter / X">
              <Twitter className="h-4 w-4" />
            </a>
          )}
          {project.discord_url && (
            <a href={project.discord_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
              title="Discord">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
            </a>
          )}
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
      </motion.div>

      {/* Quick details table */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-3">
          <DetailRow label="Chain" value={project.blockchain} />
          <DetailRow label="Token Price" value={marketData?.price_usd !== null && marketData?.price_usd !== undefined ? formatPrice(marketData.price_usd) : "—"} />
          {coinDetail?.social?.twitter_followers != null && (
            <DetailRow label="X Followers" value={formatMarketCap(coinDetail.social.twitter_followers).replace("$", "")} />
          )}
          <DetailRow label="Category" value={project.category} />
          <DetailRow label="Token" value={project.token || "—"} />
          <DetailRow label="Founded" value={project.year_founded ? String(project.year_founded) : "—"} />
        </div>
      </motion.div>

      {/* Token Market Data Card */}
      {marketData && marketData.price_usd !== null && (
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5">
          {/* Token name + price */}
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-base font-bold text-foreground">{project.token || project.name}</h3>
            <span className="text-lg font-bold text-foreground">{formatPrice(marketData.price_usd)}</span>
          </div>
          {/* Change */}
          {change24h !== null && change24h !== undefined && (
            <div className="flex items-center justify-end gap-1 mb-4">
              {isPositive ? <TrendingUp className="h-3 w-3 text-neon-green" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
              <span className={`text-xs font-medium ${isPositive ? "text-neon-green" : "text-destructive"}`}>
                {isPositive ? "+" : ""}{change24h.toFixed(2)}%
              </span>
              <span className="text-[11px] text-muted-foreground ml-1">Last 24 hours</span>
            </div>
          )}

          <div className="h-px bg-border mb-3" />

          {/* Market stats */}
          <div className="space-y-2.5">
            <DetailRow label="Market Cap" value={formatMarketCap(marketData.market_cap_usd)} />
            {coinDetail?.volume_24h != null && (
              <DetailRow label="24h Volume" value={formatMarketCap(coinDetail.volume_24h)} />
            )}
            {coinDetail?.circulating_supply != null && (
              <DetailRow label="Circulating Supply" value={formatMarketCap(coinDetail.circulating_supply).replace("$", "")} />
            )}
            {coinDetail?.total_supply != null && (
              <DetailRow label="Total Supply" value={formatMarketCap(coinDetail.total_supply).replace("$", "")} />
            )}
            {coinDetail?.fully_diluted_valuation != null && (
              <DetailRow label="Fully Diluted Val." value={formatMarketCap(coinDetail.fully_diluted_valuation)} />
            )}
            {coinDetail?.ath != null && (
              <DetailRow label="All Time High" value={formatPrice(coinDetail.ath)} valueClass="text-neon-green" />
            )}
            {(() => {
              const sparkline = marketData.sparkline_7d;
              if (!sparkline || !Array.isArray(sparkline) || sparkline.length === 0) return null;
              const arr = sparkline as number[];
              const high = Math.max(...arr);
              const low = Math.min(...arr);
              return (
                <>
                  <DetailRow label="7d High" value={formatPrice(high)} valueClass="text-neon-green" />
                  <DetailRow label="7d Low" value={formatPrice(low)} valueClass="text-destructive" />
                </>
              );
            })()}
            <DetailRow label="Data Source" value={marketData.data_source || "coingecko"} />
          </div>
        </motion.div>
      )}

      {/* Contract Addresses */}
      {coinDetail && Object.keys(coinDetail.contracts || {}).length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Contracts</h3>
          <div className="space-y-2">
            {Object.entries(coinDetail.contracts).map(([platform, address]) => (
              <div key={platform}>
                <span className="text-[11px] text-muted-foreground capitalize">{platform.replace(/-/g, " ")}</span>
                <code className="block text-[11px] text-foreground bg-secondary rounded px-2 py-1 mt-0.5 truncate" title={address}>
                  {address}
                </code>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${valueClass || "text-foreground"}`}>{value}</span>
    </div>
  );
}
