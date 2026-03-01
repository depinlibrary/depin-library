import { useMemo } from "react";
import { motion } from "framer-motion";

interface SparklineProps {
  data: { count: number }[];
  width?: number;
  height?: number;
  className?: string;
}

const Sparkline = ({ data, width = 64, height = 24, className = "" }: SparklineProps) => {
  const pathD = useMemo(() => {
    if (!data.length) return "";
    const max = Math.max(...data.map((d) => d.count), 1);
    const step = width / Math.max(data.length - 1, 1);
    return data
      .map((d, i) => {
        const x = i * step;
        const y = height - (d.count / max) * (height - 2) - 1;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, width, height]);

  const areaD = useMemo(() => {
    if (!pathD) return "";
    return `${pathD} L${width},${height} L0,${height} Z`;
  }, [pathD, width, height]);

  if (!data.length || data.every((d) => d.count === 0)) {
    return (
      <div
        className={`flex items-center justify-center text-[9px] text-muted-foreground ${className}`}
        style={{ width, height }}
      >
        No activity
      </div>
    );
  }

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaD}
        fill="url(#spark-grad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
};

export default Sparkline;
