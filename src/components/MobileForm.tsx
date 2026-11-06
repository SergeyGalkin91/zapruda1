import { cloneElement, useId, useState, type ReactElement, type ReactNode } from "react";

type FieldControl = {
  id?: string;
  type?: string;
  placeholder?: string;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | undefined;
};

export function MobileField({
  label,
  children,
  hint,
  error,
  action,
  className,
}: {
  label: string;
  children: ReactElement<FieldControl>;
  hint?: string | undefined;
  error?: string | undefined;
  action?: ReactNode;
  className?: string;
}) {
  const generatedId = useId();
  const [nativeError, setNativeError] = useState("");
  const message = error || nativeError;
  const id = children.props.id ?? generatedId;
  const floating =
    children.type === "textarea" ||
    (children.type === "input" &&
      !["date", "datetime-local", "time", "file", "checkbox", "radio", "range"].includes(
        children.props.type ?? "text",
      ));
  const describedBy = [
    children.props["aria-describedby"],
    hint && id + "-hint",
    message && id + "-error",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={["z-mobile-field", className].filter(Boolean).join(" ")}
      onInvalid={(event) => {
        const control = event.target;
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLTextAreaElement
        )
          setNativeError(control.validationMessage);
      }}
      onInput={() => setNativeError("")}
    >
      <div
        className="z-mobile-field-body"
        data-floating={floating || undefined}
        data-action={Boolean(action) || undefined}
      >
        {cloneElement(children, {
          id,
          "aria-invalid": message ? true : children.props["aria-invalid"],
          "aria-describedby": describedBy || undefined,
          ...(floating ? { placeholder: " " } : {}),
        })}
        <label htmlFor={id}>{label}</label>
        {action && <div className="z-mobile-field-action">{action}</div>}
      </div>
      {hint && (
        <p className="z-mobile-field-hint" id={id + "-hint"}>
          {hint}
        </p>
      )}
      {message && (
        <p className="z-mobile-field-error" id={id + "-error"} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

export function StickyFormActions({ children }: { children: ReactNode }) {
  return <div className="z-sticky-form-actions">{children}</div>;
}
