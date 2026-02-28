const STATUS_CONFIG = {
  queued: {
    label: "Queued",
    bg: "bg-muted/20",
    text: "text-muted",
    dot: "bg-muted",
  },
  running: {
    label: "Running",
    bg: "bg-primary/20",
    text: "text-primary",
    dot: "bg-primary animate-pulse-slow",
  },
  done: {
    label: "Done",
    bg: "bg-success/20",
    text: "text-success",
    dot: "bg-success",
  },
  failed: {
    label: "Failed",
    bg: "bg-error/20",
    text: "text-error",
    dot: "bg-error",
  },
};

export default function JobStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued;

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs uppercase tracking-wider ${config.bg} ${config.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
