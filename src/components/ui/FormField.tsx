import { ui } from "@/lib/theme";

type BaseProps = {
  label: string;
  hint?: string;
  id: string;
};

type InputProps = BaseProps &
  React.InputHTMLAttributes<HTMLInputElement> & { as?: "input" };

type SelectProps = BaseProps &
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    as: "select";
    children: React.ReactNode;
  };

type FormFieldProps = InputProps | SelectProps;

export function FormField(props: FormFieldProps) {
  const { label, hint, id, as = "input", ...rest } = props;

  return (
    <label htmlFor={id} className={ui.label}>
      {label}
      {as === "select" ? (
        <select
          id={id}
          className={`mt-2 ${ui.select}`}
          {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {(props as SelectProps).children}
        </select>
      ) : (
        <input
          id={id}
          className={`mt-2 ${ui.input}`}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {hint && <span className={`mt-1 block ${ui.labelSm}`}>{hint}</span>}
    </label>
  );
}