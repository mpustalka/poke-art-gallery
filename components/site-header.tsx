import Link from 'next/link'
import { Pokeball } from '@/components/pokeball'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-4 border-ink bg-poke-red">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Pokeball className="size-9 animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
          <span className="font-display text-lg leading-none text-cream drop-shadow-[2px_2px_0_var(--color-ink)] sm:text-xl">
            Poke Print Shop
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-semibold text-cream sm:gap-2">
          <a href="#gallery" className="rounded-full px-3 py-1.5 transition-colors hover:bg-ink/30">
            Gallery
          </a>
          <a href="#sizes" className="rounded-full px-3 py-1.5 transition-colors hover:bg-ink/30">
            Sizes
          </a>
        </nav>
      </div>
    </header>
  )
}
