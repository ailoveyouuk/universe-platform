/**
 * Shown to a Demo Access login (2026-11-02) at the top of every page, so it is always clear that what is on screen is simulated, and
 * that nothing can be changed. Renders nothing for anyone else. Colours are tokens only (no status colour is used as text).
 */
export function DemoAccessBanner({ active }: { active?: boolean }) {
  if (!active) return null;
  return (
    <div
      role="status"
      style={{
        padding: "8px clamp(14px, 4vw, 28px)",
        background: "var(--u-surface-subtle)",
        borderBottom: "1px solid var(--u-border)",
        color: "var(--u-ink)",
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <strong>Demo access.</strong> You are viewing simulated data, read-only. Nothing you see here is real, and nothing can be changed.
    </div>
  );
}
