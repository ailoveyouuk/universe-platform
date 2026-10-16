import type { ReactNode } from "react";

/**
 * Lets platform staff choose which organisation they are acting inside, from
 * the app header. The API only honours the choice for platform staff, so this
 * is purely a convenience control — render it only for them.
 */
export function OrgSwitcher({
  organizations,
  value,
  onChange,
}: {
  organizations: { id: string; name: string }[];
  value: string;
  onChange: (organizationId: string) => void;
}): ReactNode {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--u-ink-secondary)" }}>
      <span>Organisation</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Switch organisation"
        style={{
          font: "inherit",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--u-ink)",
          background: "var(--u-surface)",
          border: "1px solid var(--u-border)",
          borderRadius: 6,
          padding: "5px 8px",
          maxWidth: 220,
        }}
      >
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
