"use client";

/**
 * "Include simulated data" switch (2026-10-17). Generated scale-test organisations, users and activity are hidden
 * from Admin by default so they never mix with real customers; platform staff can switch them on to review the demo.
 */
export function IncludeSimulatedToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--u-ink-secondary)", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      Include simulated data
    </label>
  );
}
