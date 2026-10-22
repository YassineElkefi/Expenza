import Link from "next/link";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="text-accent text-sm font-medium hover:text-accent-hover"
          >
            ← {backLabel ?? "Back"}
          </Link>
        )}
        <p className="text-accent mt-4 text-xs font-semibold tracking-widest">
          EXPENZA
        </p>
        <h1 className="text-primary mt-2 text-3xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-secondary mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </header>
  );
}