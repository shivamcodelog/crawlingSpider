export default function ProgressBar({ current = 0, total = 100, showLabel = true }) {
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="font-mono text-xs text-muted">
            {current} / {total}
          </span>
          <span className="font-mono text-xs text-primary">{pct}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-border rounded overflow-hidden">
        <div
          className="h-full bg-primary rounded transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
