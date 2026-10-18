import Image from 'next/image'
import { ShoppingBag } from 'lucide-react'
import type { Artwork } from '@/lib/artworks'
import { Pokeball } from '@/components/pokeball'

export function Gallery({ artworks }: { artworks: Artwork[] }) {
  return (
    <section id="gallery" className="scroll-mt-20 border-b-4 border-ink py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow="The Collection" title="Artwork Gallery" />

        {artworks.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border-4 border-dashed border-cream/25 px-6 py-16 text-center">
            <Pokeball className="size-14 opacity-80" />
            <p className="font-display text-xl text-cream">New artwork coming soon</p>
            <p className="max-w-sm text-cream/60">Fresh prints are on their way. Check back shortly!</p>
          </div>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((art, i) => (
              <li key={art.id}>
                <article className="group flex h-full flex-col rounded-2xl border-4 border-ink bg-poke-yellow p-3 shadow-[6px_6px_0_var(--color-ink)] transition-transform hover:-translate-y-1">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <h3 className="truncate font-display text-base text-ink">{art.title}</h3>
                    <span className="shrink-0 text-xs font-bold text-ink/70">
                      No. {String(artworks.length - i).padStart(3, '0')}
                    </span>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-lg border-4 border-ink bg-cream">
                    <Image
                      src={art.imageUrl}
                      alt={art.title}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-1 pt-3">
                    {art.description ? (
                      <p className="text-sm leading-relaxed text-ink/80">{art.description}</p>
                    ) : null}
                    {art.shopUrl ? (
                      <a
                        href={art.shopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex items-center justify-center gap-2 rounded-full border-4 border-ink bg-poke-red px-4 py-2 text-sm font-bold text-cream transition-colors hover:bg-poke-red/90"
                      >
                        <ShoppingBag className="size-4" aria-hidden="true" />
                        Buy this print
                        <span className="sr-only">(opens Shopify in a new tab)</span>
                      </a>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="text-sm font-bold uppercase tracking-[0.2em] text-poke-yellow">{eyebrow}</span>
      <h2 className="font-display text-3xl text-cream text-balance sm:text-4xl">{title}</h2>
    </div>
  )
}
