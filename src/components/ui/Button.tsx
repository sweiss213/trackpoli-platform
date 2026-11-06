import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

// Material 3 buttons (ADR-0006), grayscale tokens. "filled" is the primary action (currently the
// secondary-container role per the design); "outlined" is the neutral/secondary action. Pure presentation.

type Variant = "filled" | "outlined";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Optional leading element (e.g. a provider logo), placed before the label. */
  leading?: ReactNode;
}

export function Button({ variant = "filled", leading, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${styles.button} ${styles[variant]} ${className ?? ""}`.trim()} {...rest}>
      {leading}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
