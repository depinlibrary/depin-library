import { Link } from "react-router-dom";
import { Layers, BarChart3, TrendingUp, GitCompare, Briefcase } from "lucide-react";

const footerLinks = [
  { label: "Explore", to: "/explore", icon: Layers },
  { label: "Market", to: "/market", icon: BarChart3 },
  { label: "Forecasts", to: "/forecasts", icon: TrendingUp },
  { label: "Compare", to: "/compare", icon: GitCompare },
  { label: "Portfolio", to: "/portfolio", icon: Briefcase },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⬡</span>
              <span className="text-sm font-bold text-foreground font-['Space_Grotesk']">
                DePIN Library
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Exploring decentralized physical infrastructure — one project at a time. Track, compare, and forecast the DePIN ecosystem.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Navigate</span>
            <div className="grid grid-cols-2 gap-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="group flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <link.icon className="h-3 w-3" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">About</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              DePIN Library is a community-driven platform for discovering and evaluating decentralized physical infrastructure network projects.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} DePIN Library. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Built for the DePIN community
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
