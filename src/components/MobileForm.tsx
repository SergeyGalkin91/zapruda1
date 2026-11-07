import {
  cloneElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

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

export function StickyFormActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`z-sticky-form-actions ${className}`}>{children}</div>;
}

export function SingleFieldProgress({ step, steps }: { step: number; steps: readonly string[] }) {
  return (
    <>
      <span role="status" aria-label={`Шаг ${step} из ${steps.length}`}>
        {step} / {steps.length}
      </span>
      <ol className="z-single-field-progress" aria-label="Шаги формы">
        {steps.map((id, index) => (
          <li
            key={id}
            data-complete={index < step || undefined}
            aria-current={index + 1 === step ? "step" : undefined}
          >
            <span className="sr-only">Шаг {index + 1}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

export function SingleFieldStage({
  stepKey,
  question,
  reverse,
  review,
  children,
}: {
  stepKey: string;
  question: string;
  reverse: boolean;
  review: boolean;
  children: ReactNode;
}) {
  const current = useRef({ stepKey, question, review, children });
  const [outgoing, setOutgoing] = useState<typeof current.current | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (current.current.stepKey === stepKey) {
      current.current = { stepKey, question, review, children };
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches) {
      setOutgoing(current.current);
      content.current?.animate?.(
        [
          { transform: `translateX(${reverse ? "-1.5rem" : "1.5rem"})`, opacity: 0 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        { duration: 210, easing: "ease-out" },
      );
    }
    heading.current?.focus({ preventScroll: !current.current.review });
    current.current = { stepKey, question, review, children };
  }, [stepKey, question, review, children, reverse]);

  useLayoutEffect(() => {
    if (!outgoing) return;
    const timeout = window.setTimeout(() => setOutgoing(null), 210);
    return () => window.clearTimeout(timeout);
  }, [outgoing]);

  return (
    <div
      className="z-single-field-stage"
      data-review={review || undefined}
      data-reverse={reverse || undefined}
    >
      {outgoing && (
        <fieldset className="z-single-field-outgoing" disabled inert aria-hidden="true">
          <p className="z-single-field-question">{outgoing.question}</p>
          {outgoing.children}
        </fieldset>
      )}
      <div key={stepKey} ref={content} className="z-single-field-content">
        <h2 ref={heading} tabIndex={-1} className="z-single-field-question">
          {question}
        </h2>
        {children}
      </div>
    </div>
  );
}
