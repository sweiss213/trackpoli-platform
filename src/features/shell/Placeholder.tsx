// A minimal placeholder for a guarded route whose real screen lands in a later ticket (TP1-06, migrated to
// Tailwind in TP1-07). It keeps the navigation functional — every nav target resolves to a real, shell-wrapped
// page — without pretending the feature exists. The real dashboard, record screens and admin-management
// actions each arrive with their own ticket. One <h1> per page (universal-accessibility-wcag); colour via
// semantic tokens, no CSS module.

export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-col gap-2 p-10">
      <h1 className="m-0 text-[length:var(--md-headline-medium-size)] font-normal leading-[var(--md-headline-medium-line)] tracking-[var(--md-headline-medium-tracking)] text-foreground">
        {title}
      </h1>
      <p className="m-0 text-[length:var(--md-body-medium-size)] leading-[var(--md-body-medium-line)] tracking-[var(--md-body-medium-tracking)] text-muted-foreground">
        {note ?? "This section arrives in a later Phase 1 task."}
      </p>
    </div>
  );
}
