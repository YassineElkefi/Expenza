type AlertProps = {
  type: "error" | "success" | "warning" | "info";
  children: React.ReactNode;
  className?: string;
};

const roles = {
  error: "alert" as const,
  success: "status" as const,
  warning: "status" as const,
  info: "status" as const,
};

const icons = {
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4m0 4h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  warning: (
    <>
      <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 4h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </>
  ),
};

export function Alert({ type, children, className }: AlertProps) {
  return (
    <div
      role={roles[type]}
      className={`alert alert-${type}${className ? ` ${className}` : ""}`}
    >
      <svg
        className="alert-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icons[type]}
      </svg>
      <div className="alert-content">{children}</div>
    </div>
  );
}