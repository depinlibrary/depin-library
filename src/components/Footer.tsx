const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-sm">⬡</span>
          <span className="text-sm font-medium text-foreground">
            DePIN Library
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Exploring decentralized physical infrastructure — one project at a time.
        </p>
        <p className="text-xs text-text-dim">© 2025</p>
      </div>
    </footer>
  );
};

export default Footer;
