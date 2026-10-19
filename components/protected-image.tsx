'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

type ProtectedImageProps = {
  src: string
  alt: string
  sizes: string
  className?: string
  watermark?: boolean
}

export function ProtectedImage({ src, alt, sizes, className, watermark = true }: ProtectedImageProps) {
  return (
    <div
      className="absolute inset-0 select-none [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <Image
        src={src || '/placeholder.svg'}
        alt={alt}
        fill
        sizes={sizes}
        draggable={false}
        className={cn('pointer-events-none object-cover', className)}
      />
      {watermark ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          <span className="-rotate-[30deg] whitespace-nowrap font-display text-2xl tracking-widest text-cream/25 drop-shadow-[1px_1px_0_rgba(11,16,38,0.35)] sm:text-3xl">
            © Poke Print Shop
          </span>
        </div>
      ) : null}
      {/* Transparent shield so long-press / right-click targets this layer instead of the <img> */}
      <div className="absolute inset-0" aria-hidden="true" />
    </div>
  )
}
