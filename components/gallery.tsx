import type { Artwork } from '@/lib/artworks'
import { ArtworkCard } from '@/components/artwork-card'
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
                <ArtworkCard art={art} number={artworks.length - i} />
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
