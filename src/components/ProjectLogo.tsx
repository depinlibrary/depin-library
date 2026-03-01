interface ProjectLogoProps {
  logoUrl: string | null;
  logoEmoji: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-11 w-11 rounded-lg text-xl",
  md: "h-14 w-14 rounded-xl text-2xl",
  lg: "h-16 w-16 rounded-2xl text-3xl",
};

const imgSizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

const ProjectLogo = ({ logoUrl, logoEmoji, name, size = "sm" }: ProjectLogoProps) => {
  return (
    <div className={`flex items-center justify-center ${logoUrl ? '' : 'bg-secondary'} ${sizeClasses[size]}`}>
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
