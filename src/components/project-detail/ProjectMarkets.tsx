import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { CoinDetailTicker } from "@/hooks/useCoinDetail";

interface Props {
  tickers: CoinDetailTicker[];
  tokenName: string;
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

export default function ProjectMarkets({ tickers, tokenName }: Props) {
  if (!tickers || tickers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No exchange data available for {tokenName}.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="p-5 pb-3">
        <h2 className="text-lg font-semibold text-foreground">{tokenName} Markets</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-border bg-secondary/30">
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Exchange</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Pair</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">Price</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground">24h Volume</th>
              <th className="px-5 py-3 text-center font-medium text-muted-foreground">Trust</th>
              <th className="px-5 py-3 text-right font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {tickers.map((t, i) => (
              <tr key={i} className="border-t border-border hover:bg-secondary/20 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={t.exchange_logo || `https://www.google.com/s2/favicons?domain=${t.exchange.toLowerCase().replace(/\s+/g, '')}.com&sz=32`}
                      alt={t.exchange}
                      className="h-5 w-5 rounded-full object-contain bg-secondary"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                      }}
                    />
                    <span className="font-medium text-foreground">{t.exchange}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-primary font-medium">{t.pair}</td>
                <td className="px-5 py-3 text-right text-foreground tabular-nums">
                  ${t.price < 0.01 ? t.price.toFixed(6) : t.price < 1 ? t.price.toFixed(4) : t.price.toFixed(2)}
                </td>
                <td className="px-5 py-3 text-right text-foreground tabular-nums">
                  {formatVolume(t.volume_24h)}
                </td>
                <td className="px-5 py-3 text-center">
                  {t.trust_score === "green" && <span className="inline-block h-2.5 w-2.5 rounded-full bg-neon-green" title="High trust" />}
                  {t.trust_score === "yellow" && <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" title="Medium trust" />}
                  {t.trust_score === "red" && <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" title="Low trust" />}
                  {!t.trust_score && <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  {t.trade_url && (
                    <a
                      href={t.trade_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Trade <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
