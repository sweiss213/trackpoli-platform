import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import styles from "./TextField.module.css";

// Material 3 outlined text field with an external label (ADR-0006). Supports an error state (2px error
// outline + aria-invalid), helper text (wired to the input via aria-describedby), and a trailing adornment
// (e.g. the password visibility toggle). Pure presentation; the parent owns value and handlers.

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: boolean;
  helperText?: string;
  trailing?: ReactNode;
}

export function TextField({ label, error = false, helperText, trailing, ...rest }: TextFieldProps) {
  const id = useId();
  const helperId = helperText ? `${id}-helper` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.input} ${error ? styles.inputError : ""}`.trim()}>
        <input
          id={id}
          className={styles.control}
          aria-invalid={error || undefined}
          aria-describedby={helperId}
          {...rest}
        />
        {trailing}
      </div>
      {helperText ? (
        <p id={helperId} className={styles.helper}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
