import { ExternalLink, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonsProps {
  title: string;
  description?: string;
}

const ShareButtons = ({ title, description }: ShareButtonsProps) => {
  const url = window.location.href;

  const shareOnX = () => {
    const text = `${title}${description ? ` — ${description}` : ""}`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 text-xs text-muted-foreground">
        <Share2 className="inline h-3 w-3" />
      </span>
      <button
        onClick={shareOnX}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <ExternalLink className="h-3 w-3" /> X
      </button>
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <Copy className="h-3 w-3" /> Copy
      </button>
    </div>
  );
};

export default ShareButtons;
