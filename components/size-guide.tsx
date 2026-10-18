import { cn } from '@/lib/utils'
import { formatPrice, sizeGroups, type SizeGroup } from '@/lib/sizes'
import { SectionHeading } from '@/components/gallery'

const groupStyles: Record<SizeGroup['color'], { card: string; badge: string }> = {
  red: { card: 'bg-poke-red text-cream', badge: 'bg-cream text-poke-red' },
  yellow: { card: 'bg-poke-yellow text-ink', badge: 'bg-ink text-poke-yellow' },
  blue: { card: 'bg-poke-blue text-cream', badge: 'bg-poke-yellow text-ink' },
}

const MAX_DIMENSION = 30

export function SizeGuide() {
  return (
    <section id="sizes" className="scroll-mt-20 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading eyebrow="Choose your size" title="Sizes & Prices" />

        <div className="mt-12 flex flex-col gap-12">
          {sizeGroups.map((group) => {
            const styles = groupStyles[group.color]
            return (
              <div key={group.id} className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-2xl text-cream">{group.name}</h3>
                  <span className={cn('rounded-full border-2 border-ink px-3 py-0.5 text-xs font-bold uppercase', styles.badge)}>
                    {group.type}
                  </span>
                  <div className="h-1 flex-1 rounded-full bg-cream/15" aria-hidden="true" />
                </div>

                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {group.sizes.map((size) => (
                    <li
                      key={size.label}
                      className={cn(
                        'flex flex-col gap-3 rounded-2xl border-4 border-ink p-4 shadow-[5px_5px_0_var(--color-ink)]',
                        styles.card,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-lg leading-tight">{size.label}</span>
                        <span className="shrink-0 text-xs font-bold opacity-80">in.</span>
                      </div>
                      <div
                        className="flex h-24 items-end justify-center rounded-lg border-2 border-ink bg-ink/15 p-2"
                        aria-hidden="true"
                      >
                        <div
                          className="rounded-sm border-2 border-ink bg-cream"
                          style={{
                            width: `${Math.max(14, (size.width / MAX_DIMENSION) * 100)}%`,
                            height: `${Math.max(14, (size.height / MAX_DIMENSION) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm leading-snug opacity-85">{size.detail}</p>
                      <p className="mt-auto flex items-baseline justify-between border-t-2 border-ink/30 pt-2">
                        <span className="text-xs font-bold uppercase opacity-80">Price</span>
                        <span className="font-display text-xl">{formatPrice(size.price)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
