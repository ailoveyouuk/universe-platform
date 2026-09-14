'use client'

import type { VideoBlock as VideoBlockType } from '@/types'
import { mediaUrl } from '@/lib/media'

export function VideoBlock({ title, azureBlobUrl, posterUrl, captionsUrl }: Omit<VideoBlockType, '_type' | '_key'>) {
  return (
    <figure className="mb-8">
      <div className="rounded-xl overflow-hidden bg-rc-dark shadow-card">
        <video
          controls
          poster={posterUrl}
          className="w-full aspect-video"
          preload="metadata"
        >
          <source src={mediaUrl(azureBlobUrl)} />
          {captionsUrl && <track kind="subtitles" src={captionsUrl} default />}
          Your browser does not support video playback.
        </video>
      </div>
      {title && (
        <figcaption className="text-center text-xs text-rc-grey-light mt-2">{title}</figcaption>
      )}
    </figure>
  )
}
