import Image from 'next/image'
import { Sparkles } from 'lucide-react'

export function Hero({ featuredImage }: { featuredImage?: string }) {
  return (
    <section className="relative overflow-hidden border-b-4 border-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-poke-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Handmade fan art prints
          </span>
          <h1 className="font-display text-4xl leading-tight text-balance text-cream sm:text-5xl lg:text-6xl">
            Catch your favorite art,{' '}
            <span className="text-poke-yellow drop-shadow-[3px_3px_0_var(--color-poke-red)]">print it, frame it.</span>
          </h1>
          <p className="max-w-md text-pretty text-lg leading-relaxed text-cream/75">
            Original Pokemon-inspired artwork, printed and framed by hand. From pocket-sized 4 x 4 prints to
            legendary 20 x 30 posters.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#gallery"
              className="rounded-full border-4 border-ink bg-poke-red px-6 py-3 font-bold text-cream shadow-[4px_4px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-poke-yellow"
            >
              See the artwork
            </a>
            <a
              href="#sizes"
              className="rounded-full border-4 border-ink bg-cream px-6 py-3 font-bold text-ink shadow-[4px_4px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-poke-yellow"
            >
              Sizes & prices
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-4 -z-10 rotate-3 rounded-3xl bg-poke-yellow" aria-hidden="true" />
          <div className="overflow-hidden rounded-3xl border-4 border-ink bg-ink shadow-[8px_8px_0_var(--color-poke-red)]">
            <div className="relative aspect-[4/5]">
              <Image
                src={featuredImage ?? '/images/hero-prints.png'}
                alt="Featured artwork print"
                fill
                priority
                sizes="(min-width: 768px) 448px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
