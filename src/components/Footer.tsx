import { Link } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import {
  Layers,
  BarChart3,
  TrendingUp,
  GitCompare,
  Briefcase,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Heart,
} from "lucide-react";

const navLinks = [
  { label: "Explore", to: "/explore", icon: Layers },
  { label: "Market", to: "/market", icon: BarChart3 },
  { label: "Forecasts", to: "/forecasts", icon: TrendingUp },
  { label: "Compare", to: "/compare", icon: GitCompare },
  { label: "Portfolio", to: "/portfolio", icon: Briefcase },
];

const resourceLinks = [
  { label: "What is DePIN?", to: "/explore", icon: BookOpen },
  { label: "Submit a Project", to: "/submit", icon: ArrowRight },
  { label: "Community Forecasts", to: "/forecasts", icon: TrendingUp },
];

const Footer = () => {
  return (
    <footer className="relative border-t border-border bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[300px] rounded-full bg-primary/[0.02] blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
        {/* Main footer grid */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src={logoImg} alt="DePIN Library" className="h-8 w-8 rounded-lg object-contain" />
              <span className="text-sm font-bold text-foreground font-['Space_Grotesk'] tracking-tight">
                DePIN Library
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
              The community-driven intelligence platform for discovering, tracking, and evaluating Decentralized Physical Infrastructure Networks.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
                <svg className="h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://discord.gg/lovable-dev" target="_blank" rel="noopener noreferrer" className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
                <svg className="h-3 w-3 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
            </div>
          </div>

          {/* Navigate column */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-widest">Navigate</span>
            <div className="flex flex-col gap-2.5">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="group flex items-center gap-2.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <link.icon className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Resources column */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-widest">Resources</span>
            <div className="flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="group flex items-center gap-2.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <link.icon className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  {link.label}
                </Link>
              ))}
              <a
                href="#"
                className="group flex items-center gap-2.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                FAQ
              </a>
            </div>
          </div>

          {/* CTA / About column */}
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-widest">Stay Connected</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              DePIN Library is built by and for the community. Explore, rate, forecast, and help shape the future of decentralized infrastructure.
            </p>
            <Link
              to="/explore"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/15 px-4 py-2.5 text-xs font-semibold text-primary transition-all w-fit"
            >
              Start Exploring
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-6">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} DePIN Library. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            Built with <Heart className="h-3 w-3 text-destructive/60" /> for the DePIN community
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;