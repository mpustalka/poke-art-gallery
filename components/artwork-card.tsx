'use client'

import { useRef } from 'react'
import { Maximize2, ShoppingBag, X } from 'lucide-react'
import type { Artwork } from '@/lib/artworks'
import { formatPrice, sizeGroups, type SizeGroup } from '@/lib/sizes'
import { cn } from '@/lib/utils'
import { ProtectedImage } from '@/components/protected-image'

const badgeStyles: Record<SizeGroup['color'], string> = {
  red: 'bg-poke-red text-cream',
  yellow: 'bg-poke-yellow text-ink',
  blue: 'bg-poke-blue text-cream',
}

export function ArtworkCard({ art, number }: { art: Artwork; number: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const label = `No. ${String(number).padStart(3, '0')}`
  const startingPrice = Math.min(...sizeGroups.flatMap((g) => g.sizes.map((s) => s.price)))

  const open = () => dialogRef.current?.showModal()
  const close = () => dialogRef.current?.close()

  return (
    <article className="group flex h-full flex-col rounded-2xl border-4 border-ink bg-poke-yellow p-3 shadow-[6px_6px_0_var(--color-ink)] transition-transform hover:-translate-y-1">
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="truncate font-display text-base text-ink">{art.title}</h3>
        <span className="shrink-0 text-xs font-bold text-ink/70">{label}</span>
      </div>

      <button
        type="button"
        onClick={open}
        className="relative block aspect-square cursor-zoom-in overflow-hidden rounded-lg border-4 border-ink bg-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-poke-blue"
        aria-haspopup="dialog"
      >
        <span className="sr-only">View sizes and prices for {art.title}</span>
        <ProtectedImage
          src={art.imageUrl}
          alt={art.title}
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <span
          className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-cream px-3 py-1 text-xs font-bold text-ink opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >
          <Maximize2 className="size-3" />
          Sizes & prices
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 px-1 pt-3">
        {art.description ? <p className="text-sm leading-relaxed text-ink/80">{art.description}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-ink">From {formatPrice(startingPrice)}</span>
          <button
            type="button"
            onClick={open}
            className="inline-flex items-center justify-center gap-2 rounded-full border-4 border-ink bg-poke-red px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-poke-red/90"
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            View options
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={`art-${art.id}-title`}
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
        className="m-auto max-h-[90dvh] w-[min(56rem,calc(100%-2rem))] overflow-hidden rounded-3xl border-4 border-ink bg-cream p-0 text-ink shadow-[8px_8px_0_var(--color-ink)] backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[calc(90dvh-8px)] flex-col overflow-y-auto md:flex-row">
          <div className="relative aspect-square w-full shrink-0 border-b-4 border-ink bg-ink md:w-1/2 md:border-b-0 md:border-r-4">
            <ProtectedImage src={art.imageUrl} alt={art.title} sizes="(min-width: 768px) 450px, 100vw" />
          </div>

          <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-poke-red">{label}</span>
                <h2 id={`art-${art.id}-title`} className="font-display text-2xl leading-tight text-balance">
                  {art.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-full border-4 border-ink bg-poke-yellow p-1.5 transition-colors hover:bg-poke-yellow/80"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {art.description ? <p className="text-sm leading-relaxed text-ink/75">{art.description}</p> : null}

            <div className="flex flex-col gap-4">
              {sizeGroups.map((group) => (
                <section key={group.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base">{group.name}</h3>
                    <span
                      className={cn(
                        'rounded-full border-2 border-ink px-2 py-0.5 text-[10px] font-bold uppercase',
                        badgeStyles[group.color],
                      )}
                    >
                      {group.type}
                    </span>
                  </div>
                  <ul className="divide-y-2 divide-ink/10 rounded-xl border-2 border-ink bg-white/60">
                    {group.sizes.map((size) => (
                      <li key={size.label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="flex flex-col">
                          <span className="font-bold">{size.label}</span>
                          <span className="text-xs text-ink/60">{size.detail}</span>
                        </span>
                        <span className="font-display text-base">{formatPrice(size.price)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {art.shopUrl ? (
              <a
                href={art.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sticky bottom-0 inline-flex items-center justify-center gap-2 rounded-full border-4 border-ink bg-poke-red px-4 py-3 text-sm font-bold text-cream shadow-[4px_4px_0_var(--color-ink)] transition-colors hover:bg-poke-red/90"
              >
                <ShoppingBag className="size-4" aria-hidden="true" />
                Buy this print
                <span className="sr-only">(opens Shopify in a new tab)</span>
              </a>
            ) : null}
          </div>
        </div>
      </dialog>
    </article>
  )
}
