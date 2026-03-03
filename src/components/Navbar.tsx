import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Plus, User, Shield, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 glow-primary-sm">
            <span className="text-sm">⬡</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            DePIN <span className="text-primary">Library</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Explore
          </Link>
          <Link to="/learn" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Learn
          </Link>
          <Link to="/market" className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Market
          </Link>

          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link
                to="/submit"
                className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Submit Project</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <User className="h-3 w-3" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
