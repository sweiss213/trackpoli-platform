import { Suspense, type ReactNode } from "react";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

// The authenticated admin shell (TP1-06; Figma 1221:2432/2583): the role-gated side navigation, the top bar,
// and the page content. Used by the (app) route-group layout, which has already enforced the session/active
// guards server-side before rendering this. The full shell (snackbar/dialog hosts, loading/empty states,
// focus management) lands with P1-12; this is the minimal shell role-based access needs.

export function AppShell({ displayName, children }: { displayName: string; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <SideNav displayName={displayName} />
      <div className={styles.main}>
        <Suspense>
          <TopBar displayName={displayName} />
        </Suspense>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
