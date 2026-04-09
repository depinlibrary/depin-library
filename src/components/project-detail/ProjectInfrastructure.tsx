import { motion } from "framer-motion";
import { ExternalLink, Server, Globe, Wifi, Radio, HardDrive, Database, Cloud, Cpu, Monitor, Smartphone, Camera, Map, Activity, Users, Video, Thermometer, Car, CloudRain } from "lucide-react";
import type { InfrastructureItem } from "@/hooks/useProjectInfrastructure";

const iconMap: Record<string, React.ElementType> = {
  Server, Globe, Wifi, Radio, HardDrive, Database, Cloud, Cpu, Monitor,
  Smartphone, Camera, Map, Activity, Users, Video, Thermometer, Car, CloudRain,
};

interface Props {
  items: InfrastructureItem[];
  projectName: string;
}

export default function ProjectInfrastructure({ items, projectName }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="p-5 pb-3">
        <h2 className="text-lg font-semibold text-foreground">{projectName} Infrastructure</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-5 pt-2">
        {items.map((item) => {
          const Icon = item.icon_name ? iconMap[item.icon_name] : Server;
          const content = (
            <div
              key={item.id}
              className={`rounded-lg border border-border bg-secondary/30 p-4 flex flex-col gap-2 transition-colors ${
                item.link_url ? "hover:bg-secondary/60 cursor-pointer" : ""
              }`}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span className="text-xs font-medium truncate">{item.label}</span>
                {item.link_url && <ExternalLink className="h-3 w-3 ml-auto shrink-0 text-primary" />}
              </div>
              <span className="text-lg font-bold text-foreground leading-tight">{item.value}</span>
            </div>
          );

          if (item.link_url) {
            return (
              <a
                key={item.id}
                href={item.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline"
              >
                {content}
              </a>
            );
          }

          return content;
        })}
      </div>
    </motion.div>
  );
}
