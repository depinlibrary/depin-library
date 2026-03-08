interface ProjectLogoProps {
  logoUrl: string | null;
  logoEmoji: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const sizeClasses = {
  xs: "h-6 w-6 rounded-[5px] text-sm",
  sm: "h-11 w-11 rounded-[7px] text-xl",
  md: "h-14 w-14 rounded-[7px] text-2xl",
  lg: "h-16 w-16 rounded-[7px] text-3xl",
};

const imgSizeClasses = {
  xs: "h-6 w-6",
  sm: "h-11 w-11",
  md: "h-14 w-14",
  lg: "h-16 w-16",
};

const ProjectLogo = ({ logoUrl, logoEmoji, name, size = "sm" }: ProjectLogoProps) => {
  return (
    <div className={`flex items-center justify-center overflow-hidden ${logoUrl ? '' : 'bg-secondary'} ${sizeClasses[size]}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className={`${imgSizeClasses[size]} object-contain`}
          onError={(e) => {
            // Fallback to emoji on image load failure
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).parentElement!.textContent = logoEmoji;
          }}
        />
      ) : (
        logoEmoji
      )}
    </div>
  );
};

export default ProjectLogo;
