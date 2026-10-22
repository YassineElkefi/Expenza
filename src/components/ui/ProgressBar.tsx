type ProgressBarProps = {
  value: number; // 0–100
  className?: string;
};

export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  const progress = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className={`progress-track h-2 w-48 max-w-full ${className}`}
    >
      <div
        className="progress-fill"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}