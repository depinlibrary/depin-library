import { Link } from "react-router-dom";
import {
  Layers,
  BarChart3,
  TrendingUp,
  GitCompare,
  Briefcase,
  ArrowRight,
  Globe,
  Shield,
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-base">⬡</span>
              </div>
              <span className="text-sm font-bold text-foreground font-['Space_Grotesk'] tracking-tight">
                DePIN Library
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
              The community-driven intelligence platform for discovering, tracking, and evaluating Decentralized Physical Infrastructure Networks.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer">
                <Globe className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer">
                <Shield className="h-3 w-3 text-muted-foreground" />
              </div>
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