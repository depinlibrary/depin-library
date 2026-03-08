import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAvatar = () => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) { setAvatarUrl(null); setDisplayName(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    setAvatarUrl((data as any)?.avatar_url ?? null);
    setDisplayName(data?.display_name ?? null);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      await supabase.storage.from("avatars").remove([path]);
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase
        .from("profiles")
        .update({ avatar_url: url } as any)
        .eq("user_id", user.id);
      setAvatarUrl(url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const updateDisplayName = async (name: string) => {
    if (!user) return false;
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) return false;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", user.id);
    if (!error) {
      setDisplayName(trimmed);
      return true;
    }
    return false;
  };

  return { avatarUrl, displayName, uploading, uploadAvatar, updateDisplayName, refetch: fetchProfile };
};
