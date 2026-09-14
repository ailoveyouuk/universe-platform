'use client'

import type { AudioBlock as AudioBlockType } from '@/types'
import { mediaUrl } from '@/lib/media'

export function AudioBlock({ title, azureBlobUrl }: Omit<AudioBlockType, '_type' | '_key'>) {
  return (
    <div className="mb-6 bg-rc-green-50 border border-rc-green/20 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-rc-green flex items-center justify-center flex-shrink-0">
        <span className="text-white text-lg">🎧</span>
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-medium text-rc-dark mb-1">{title}</p>}
        <audio controls className="w-full h-8" preload="metadata">
          <source src={mediaUrl(azureBlobUrl)} />
          Your browser does not support audio playback.
        </audio>
      </div>
    </div>
  )
}
