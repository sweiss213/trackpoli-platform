import styles from "./Placeholder.module.css";

// A minimal placeholder for a guarded route whose real screen lands in a later ticket (TP1-06). It keeps the
// navigation functional — every nav target resolves to a real, shell-wrapped page — without pretending the
// feature exists. The dashboard content, the record screens and the admin-management actions each arrive with
// their own ticket.

export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>{note ?? "This section arrives in a later Phase 1 task."}</p>
    </div>
  );
}
