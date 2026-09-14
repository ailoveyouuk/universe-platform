// ─────────────────────────────────────────────────────────────────────────────
// Asset URL helper
// ─────────────────────────────────────────────────────────────────────────────
// All content images/video/audio are static assets served either from
// /public (bundled with the app) or from Azure Blob Storage. There is no
// CMS involved.
//
// Set NEXT_PUBLIC_ASSET_BASE_URL to the storage account root (no trailing
// slash), e.g. https://rcplatformassets.blob.core.windows.net
// localSrc/azureBlobUrl values like /images/sm1/... or /videos/... resolve
// to {base}/images/sm1/... etc. If NEXT_PUBLIC_ASSET_BASE_URL is unset, the
// path is used as-is (served from /public).

import type { ImageAsset } from '@/types'

function resolveAssetPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? ''
  return base ? `${base}${path}` : path
}

export function imageUrl(source: ImageAsset, _width: number): string {
  return resolveAssetPath(source.localSrc)
}

// Video/audio blocks store their path in `azureBlobUrl` (e.g.
// '/videos/talking-heads/Some Title.mp4') — same resolution as images.
export function mediaUrl(azureBlobUrl: string): string {
  return resolveAssetPath(azureBlobUrl)
}
