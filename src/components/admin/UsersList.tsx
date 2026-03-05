import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";
import { motion } from "framer-motion";

type UserProfile = {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  role?: string;
};

const UsersList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const roleMap = new Map<string, string>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role));

      setUsers(
        (profiles || []).map((p) => ({
          ...p,
          role: roleMap.get(p.user_id) || "user",
        }))
      );
    };
    fetchUsers();
  }, []);

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
