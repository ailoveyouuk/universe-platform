import type { SVGProps } from "react";

/**
 * Universe iconography — hand-built, matching the Design System's
 * iconography spec (universe-brand-identity.md "Iconography"): 24x24 grid,
 * 1.75px stroke, round caps/joins, currentColor throughout so each icon
 * recolours by context (ink, brand-violet, accent-magenta, status-*) the
 * same way universe-mark-mono.svg does. No external icon package — the
 * brand doc's 28-icon set was never exported as individual files in the
 * canonical Design System artifact (only the Logos asset group exists
 * there), so this is a small first slice of that set: just what the
 * app shell, dashboard and nav need. Extend this file as more screens
 * need icons rather than reaching for a generic icon library, so the
 * stroke weight/cap style stays consistent everywhere.
 */
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function base(props: IconProps) {
  const { size = 20, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "var(--u-icon-stroke, 1.75)",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5" />
      <rect x="13" y="10.5" width="7.5" height="10" rx="1.5" />
      <rect x="3.5" y="13.5" width="7.5" height="7" rx="1.5" />
    </svg>
  );
}

export function ProjectsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7a2 2 0 0 1 2-2h3.17a1 1 0 0 1 .8.4l1.2 1.6H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

export function PartnersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M3 19.5c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <path d="M14.5 14.8c2.3.3 4 2.1 4 4.7" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 5.5 8.5 12 15 18.5" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M19 19 15.3 15.3" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.3 5.3 1.3 5.3H4.7S6 14.5 6 10.5Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.3" r="3.3" />
      <path d="M5 19.3c0-3.5 3.1-6.3 7-6.3s7 2.8 7 6.3" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H9" />
      <path d="M13 12h7" />
      <path d="M17 8.3 20.7 12 17 15.7" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.3 11 14.8l4.5-5.6" />
    </svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 16 9.5 10.5 13.5 14.5 20 7" />
      <path d="M14.5 7h5.5v5.5" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="3.5" width="10" height="17" rx="1" />
      <path d="M15 20.5h4.5V11L15 8.5" />
      <path d="M8 7.5h.01M11.5 7.5h.01M8 11h.01M11.5 11h.01M8 14.5h.01M11.5 14.5h.01" strokeWidth="2.5" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3.5h7l4 4v13H7Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 13h5M9.5 16h5" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4 21 19H3Z" />
      <path d="M12 10.3v3.4M12 16.7h.01" strokeWidth="2.5" />
    </svg>
  );
}
