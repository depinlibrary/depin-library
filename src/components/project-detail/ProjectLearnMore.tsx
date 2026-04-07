import { motion } from "framer-motion";
import { ExternalLink, FileText, Github } from "lucide-react";
import type { CoinDetail } from "@/hooks/useCoinDetail";

interface Props {
  coinDetail: CoinDetail;
  projectName: string;
  projectDescription: string;
}

export default function ProjectLearnMore({ coinDetail, projectName, projectDescription }: Props) {
  const contracts = coinDetail.contracts || {};
  const contractEntries = Object.entries(contracts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* About */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground mb-3">About {projectName}</h2>
        {coinDetail.description ? (
          <p
            className="text-sm leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: coinDetail.description.slice(0, 1000) }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{projectDescription}</p>
        )}

        {/* Links */}
        <div className="mt-4 flex flex-wrap gap-2">
          {coinDetail.links?.homepage && (
            <a href={coinDetail.links.homepage} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <ExternalLink className="h-3 w-3" /> Website
            </a>
          )}
          {coinDetail.links?.whitepaper && (
            <a href={coinDetail.links.whitepaper} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <FileText className="h-3 w-3" /> Whitepaper
            </a>
          )}
          {coinDetail.links?.repos && (
            <a href={coinDetail.links.repos} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <Github className="h-3 w-3" /> GitHub
            </a>
          )}
        </div>
      </div>

      {/* Categories */}
      {coinDetail.categories && coinDetail.categories.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground mb-3">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {coinDetail.categories.filter(Boolean).map((cat) => (
              <span key={cat} className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contract Addresses */}
      {contractEntries.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-base font-semibold text-foreground mb-3">Contracts</h3>
          <div className="space-y-2">
            {contractEntries.map(([platform, address]) => (
              <div key={platform} className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground capitalize whitespace-nowrap">{platform.replace(/-/g, " ")}</span>
                <code className="text-xs text-foreground bg-secondary rounded px-2 py-1 truncate max-w-[300px]" title={address}>
                  {address}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
