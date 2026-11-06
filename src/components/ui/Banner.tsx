import type { ReactNode } from "react";
import styles from "./Banner.module.css";

// Inline notice banner (ADR-0006). role="alert" so a screen reader announces it when it appears — used for
// the sign-in error. Grayscale tokens; the icon colour comes from the asset it is given.

interface BannerProps {
  icon?: ReactNode;
  children: ReactNode;
}

export function Banner({ icon, children }: BannerProps) {
  return (
    <div className={styles.banner} role="alert">
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <p className={styles.text}>{children}</p>
    </div>
  );
}
