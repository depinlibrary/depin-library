import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Item = { id: string; name: string; created_at: string };

interface ManageListProps {
  tableName: "categories" | "blockchains";
  title: string;
}

const ManageList = ({ tableName, title }: ManageListProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase
      .from(tableName)
      .select("*")
      .order("name");
    setItems((data as Item[]) || []);
  };

  useEffect(() => {
    fetchItems();
  }, [tableName]);

  const addItem = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" already exists`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from(tableName).insert({ name: trimmed });
    if (error) toast.error(error.message);
    else {
      toast.success(`${trimmed} added`);
      setNewName("");
      fetchItems();
    }
    setLoading(false);
  };

  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"?`)) return;
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${name} removed`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder={`Add new ${title.toLowerCase().slice(0, -2)}...`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          className="max-w-xs"
        />
        <Button size="sm" onClick={addItem} disabled={loading || !newName.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
          >
            <span className="text-sm font-medium text-foreground">{item.name}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => deleteItem(item.id, item.name)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))}
        {items.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No {title.toLowerCase()} yet</p>
        )}
      </div>
    </div>
  );
};

export const ManageCategories = () => <ManageList tableName="categories" title="Categories" />;
export const ManageBlockchains = () => <ManageList tableName="blockchains" title="Blockchains" />;
