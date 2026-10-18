import { Pokeball } from '@/components/pokeball'

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-ink bg-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-cream/60 sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <Pokeball className="size-6" />
          <span className="font-display text-cream">Poke Print Shop</span>
        </div>
        <p className="text-pretty">
          Fan art. Pokemon and related characters are trademarks of Nintendo, Game Freak, and Creatures Inc.
        </p>
      </div>
    </footer>
  )
}
