import { User } from "lucide-react";

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "h-6 w-6", icon: "h-3 w-3", text: "text-[10px]" },
  md: { container: "h-8 w-8", icon: "h-3.5 w-3.5", text: "text-xs" },
  lg: { container: "h-10 w-10", icon: "h-4 w-4", text: "text-sm" },
};

const UserAvatar = ({ avatarUrl, displayName, size = "md", className = "" }: UserAvatarProps) => {
  const s = sizeMap[size];
  const initial = (displayName || "A")[0].toUpperCase();

  return (
    <div className={`${s.container} rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName || "User"} className={`${s.container} rounded-full object-cover`} />
      ) : (
        <span className={`${s.text} font-bold text-secondary-foreground`}>{initial}</span>
      )}
    </div>
  );
};

export default UserAvatar;
