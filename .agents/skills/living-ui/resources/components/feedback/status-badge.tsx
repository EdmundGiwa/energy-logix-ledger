import React from "react";

export type StatusType = "online" | "offline" | "busy" | "connecting" | "warning";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  ping?: boolean;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { label: string; dotClass: string; pingClass: string; badgeClass: string }
> = {
  online: {
    label: "Online",
    dotClass: "bg-emerald-500",
    pingClass: "bg-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-zinc-400",
    pingClass: "bg-zinc-300",
    badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  },
  busy: {
    label: "Busy",
    dotClass: "bg-rose-500",
    pingClass: "bg-rose-400",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  connecting: {
    label: "Connecting",
    dotClass: "bg-amber-500",
    pingClass: "bg-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  warning: {
    label: "Degraded",
    dotClass: "bg-orange-500",
    pingClass: "bg-orange-400",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  ping = true,
  className = "",
}) => {
  const config = statusConfig[status] || statusConfig.offline;
  const displayLabel = label || config.label;

  return (
    <span
      role="status"
      aria-label={`Status: ${displayLabel}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${config.badgeClass} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {ping && status !== "offline" && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pingClass}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`} />
      </span>
      <span>{displayLabel}</span>
    </span>
  );
};
