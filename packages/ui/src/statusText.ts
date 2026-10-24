/**
 * The text-safe version of a status colour. Status colours used as dots, bars and fills only need 3:1 contrast, but the same colour used as text needs 4.5:1,
 * which the bright amber, orange and green do not reach on white. Known status tokens map to their `-text` twins; any other colour is darkened.
 */
export function statusText(color: string): string {
  const m = /^var\(--u-status-(good|warning|serious|critical)\)$/.exec(color);
  if (m) return `var(--u-status-${m[1]}-text)`;
  return /^(var\(|hsl|#|rgb)/.test(color) ? `color-mix(in srgb, ${color} 58%, #000)` : color;
}
