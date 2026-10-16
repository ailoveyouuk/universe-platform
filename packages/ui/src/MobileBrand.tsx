"use client";

import { useEffect, useState } from "react";

/**
 * The organisation's mark in the app header on phones and tablets (≤900px,
 * where the sidebar is a drawer and so the sidebar logo is out of sight).
 * Prefers the optional square icon; otherwise the main logo scaled down.
 * A tiny "Powered by Universe" sits beneath it. Hidden on desktop and when
 * the organisation has no logo (the Universe mark would just repeat itself).
 */
export function MobileBrand({ logoUrl, iconUrl, name }: { logoUrl: string | null; iconUrl: string | null; name: string }) {
  const [iconFailed, setIconFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => setIconFailed(false), [iconUrl]);
  useEffect(() => setLogoFailed(false), [logoUrl]);

  const useIcon = !!iconUrl && !iconFailed;
  const src = useIcon ? iconUrl : !logoFailed ? logoUrl : null;
  if (!src) return null;

  return (
    <div className="u-mobile-brand" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, paddingRight: 14, borderRight: "1px solid var(--u-border)" }}>
      <img
        src={src}
        alt={name}
        onError={() => (useIcon ? setIconFailed(true) : setLogoFailed(true))}
        style={{ height: 26, width: "auto", maxWidth: useIcon ? 32 : 110, objectFit: "contain", objectPosition: "left center", display: "block" }}
      />
      <span style={{ fontSize: 8.5, letterSpacing: "0.04em", color: "var(--u-ink-secondary)", whiteSpace: "nowrap", lineHeight: 1 }}>Powered by Universe</span>
    </div>
  );
}
