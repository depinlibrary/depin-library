import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck, ShieldOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";

type UserProfile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url?: string | null;
  created_at: string;
  role?: string;
  roleId?: string;
};

const UsersList = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("id, user_id, role");

    const roleMap = new Map<string, { role: string; id: string }>();
    roles?.forEach((r) => roleMap.set(r.user_id, { role: r.role, id: r.id }));

    setUsers(
      (profiles || []).map((p) => ({
        ...p,
        role: roleMap.get(p.user_id)?.role || "user",
        roleId: roleMap.get(p.user_id)?.id,
      }))
    );
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleRole = async (profile: UserProfile) => {
    if (profile.user_id === currentUser?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    const newRole = profile.role === "admin" ? "user" : "admin";
    if (newRole === "admin" && !confirm(`Promote "${profile.display_name || "this user"}" to admin?`)) return;
    if (newRole === "user" && !confirm(`Demote "${profile.display_name || "this user"}" to user?`)) return;

    setToggling(profile.user_id);

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", profile.user_id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${profile.display_name || "User"} is now ${newRole}`);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === profile.user_id ? { ...u, role: newRole } : u
        )
      );
    }
    setToggling(null);
  };

  const filtered = search
    ? users.filter(
        (u) =>
          (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
          u.user_id.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          <Users className="mr-2 inline h-5 w-5" />
          Registered Users ({users.length})
        </h2>
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <div className="space-y-1.5">
        {filtered.map((user) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {user.display_name || "Anonymous"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                ID: {user.user_id.slice(0, 8)}...
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  user.role === "admin"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {user.role}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
              <Button
                size="sm"
                variant={user.role === "admin" ? "outline" : "default"}
                className="h-7 text-xs"
                disabled={toggling === user.user_id || user.user_id === currentUser?.id}
                onClick={() => toggleRole(user)}
              >
                {user.role === "admin" ? (
                  <><ShieldOff className="mr-1 h-3 w-3" /> Demote</>
                ) : (
                  <><ShieldCheck className="mr-1 h-3 w-3" /> Promote</>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
        )}
      </div>
    </div>
  );
};

export default UsersList;
