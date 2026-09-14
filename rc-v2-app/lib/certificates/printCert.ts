// ─────────────────────────────────────────────────────────────────────────────
// printCertificateAsPdf — isolate and print a certificate element as PDF
// ─────────────────────────────────────────────────────────────────────────────

export function printCertificateAsPdf(certId: string, fileName: string): void {
  if (typeof window === 'undefined') return

  const el = document.querySelector(`[data-certificate-id="${certId}"]`) as HTMLElement | null
  if (!el) return

  const prevTitle = document.title
  document.title = fileName

  const portal = document.createElement('div')
  portal.id = 'rc-cert-print-portal'
  portal.style.cssText =
    'position:fixed;inset:0;z-index:9999;background:#111827;display:none;'

  // Clone the inner cert div and reset its transform so it prints at native 1200×850
  const clone = el.cloneNode(true) as HTMLElement
  clone.style.cssText = 'width:1200px;height:850px;transform:none;position:absolute;top:0;left:0;'
  portal.appendChild(clone)
  document.body.appendChild(portal)

  const style = document.createElement('style')
  style.id = 'rc-cert-print-style'
  style.textContent = `
    @media print {
      body > *:not(#rc-cert-print-portal) { display: none !important; }
      #rc-cert-print-portal {
        display: block !important;
        position: fixed;
        inset: 0;
        width: 1200px;
        height: 850px;
      }
      /* Page sized to exactly match the certificate — no scaling needed */
      @page { margin: 0; size: 1200px 850px; }
    }
  `
  document.head.appendChild(style)

  window.print()

  setTimeout(() => {
    document.head.removeChild(style)
    document.body.removeChild(portal)
    document.title = prevTitle
  }, 1000)
}
