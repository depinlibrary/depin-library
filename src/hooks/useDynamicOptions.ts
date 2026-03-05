import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useDynamicOptions = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [blockchains, setBlockchains] = useState<string[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [catRes, bcRes] = await Promise.all([
        supabase.from("categories").select("name").order("name"),
        supabase.from("blockchains").select("name").order("name"),
      ]);
      setCategories((catRes.data || []).map((c) => c.name));
      setBlockchains((bcRes.data || []).map((b) => b.name));
    };
    fetch();
  }, []);

  return { categories, blockchains };
};
