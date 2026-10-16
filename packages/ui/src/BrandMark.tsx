"use client";

import { useState, type ReactNode } from "react";
import { Logo } from "./Logo";

/** The mark shown on pre-sign-in screens: the organisation's own logo if this
 * browser has signed in before (remembered locally), otherwise the Universe
 * mark. Falls back to the Universe mark if the image can't load. */
export function BrandMark({ logoUrl, name, size = 44 }: { logoUrl?: string | null; name?: string | null; size?: number }): ReactNode {
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name ?? "Organisation logo"}
        onError={() => setFailed(true)}
        style={{ height: size + 8, width: "auto", maxWidth: 200, objectFit: "contain", display: "block" }}
      />
    );
  }
  return <Logo variant="mark" size={size} />;
}
