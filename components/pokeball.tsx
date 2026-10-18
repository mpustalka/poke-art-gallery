import { cn } from '@/lib/utils'

export function Pokeball({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn('size-8', className)}>
      <circle cx="50" cy="50" r="46" fill="var(--color-cream)" stroke="var(--color-ink)" strokeWidth="6" />
      <path d="M4 50a46 46 0 0 1 92 0Z" fill="var(--color-poke-red)" stroke="var(--color-ink)" strokeWidth="6" />
      <line x1="4" y1="50" x2="96" y2="50" stroke="var(--color-ink)" strokeWidth="6" />
      <circle cx="50" cy="50" r="14" fill="var(--color-cream)" stroke="var(--color-ink)" strokeWidth="6" />
      <circle cx="50" cy="50" r="6" fill="var(--color-cream)" stroke="var(--color-ink)" strokeWidth="3" />
    </svg>
  )
}
