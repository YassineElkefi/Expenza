import { Card } from "./Card";

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: "emerald" | "amber" | "red";
};

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  const valueColor =
    accent === "emerald"
      ? "var(--success)"
      : accent === "amber"
        ? "var(--warning)"
        : accent === "red"
          ? "var(--danger)"
          : "var(--text-primary)";

  return (
    <Card accent={accent}>
      <p className="text-secondary text-sm">{label}</p>
      <p className="mt-3 text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </p>
      {sub && <p className="text-muted mt-1 text-sm">{sub}</p>}
    </Card>
  );
}