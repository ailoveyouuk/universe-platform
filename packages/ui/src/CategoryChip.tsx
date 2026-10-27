import { categoryAccent, categoryLabel } from "@universe/types";

/**
 * The one way to show a stakeholder category: a small colour swatch plus the label. The swatch comes from the category colour token and is decoration only;
 * the label stays in the normal ink colour on a neutral chip, so contrast never depends on the accent. Used wherever a category appears, in every app.
 */
export function CategoryChip({ category }: { category: string }) {
  const token = categoryAccent(category);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 9px", borderRadius: 999, border: "1px solid var(--u-border)", background: "var(--u-surface-raised)", color: "var(--u-ink)", fontSize: 12, fontWeight: 600, lineHeight: 1.5 }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, flex: "none", background: token ? `var(${token})` : "var(--u-border)" }} />
      {categoryLabel(category)}
    </span>
  );
}
