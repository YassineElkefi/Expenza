type CardProps = {
  children: React.ReactNode;
  className?: string;
  accent?: "emerald" | "amber" | "red";
};

const accentStyles = {
  emerald: {
    borderColor: "color-mix(in srgb, var(--success) 35%, var(--border))",
    backgroundColor: "color-mix(in srgb, var(--success) 6%, var(--bg-surface))",
  },
  amber: {
    borderColor: "color-mix(in srgb, var(--warning) 35%, var(--border))",
    backgroundColor: "color-mix(in srgb, var(--warning) 6%, var(--bg-surface))",
  },
  red: {
    borderColor: "color-mix(in srgb, var(--danger) 35%, var(--border))",
    backgroundColor: "color-mix(in srgb, var(--danger) 6%, var(--bg-surface))",
  },
};

export function Card({ children, className = "", accent }: CardProps) {
  return (
    <div
      className={`surface p-5 ${className}`}
      style={accent ? accentStyles[accent] : undefined}
    >
      {children}
    </div>
  );
}