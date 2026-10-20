// components/ui/Alert.tsx
import { ui } from "@/lib/theme";

type AlertProps = {
  type: "error" | "success" | "warning";
  children: React.ReactNode;
};

const roles = {
  error: "alert" as const,
  success: "status" as const,
  warning: "status" as const,
};

const styles = {
  error: ui.alertError,
  success: ui.alertSuccess,
  warning: ui.alertWarning,
};

export function Alert({ type, children }: AlertProps) {
  return (
    <div role={roles[type]} className={styles[type]}>
      {children}
    </div>
  );
}