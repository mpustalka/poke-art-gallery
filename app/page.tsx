import { CatalogProvider, HeroImage } from "@/components/shop/catalog";
import CommunitySections from "@/components/shop/community";
import Storefront from "@/components/shop/storefront";
// Restored from the original published gallery; styles and assets are hosted locally.
export default function Page() {
  return (
    <CatalogProvider>
      <>
        <header className="sticky top-0 z-40 border-b-4 border-ink bg-poke-red">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <a className="flex items-center gap-3" href="/">
              <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                className="size-9 animate-[spin_6s_linear_infinite] motion-reduce:animate-none"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="var(--color-cream)"
                  stroke="var(--color-ink)"
                  strokeWidth="6"
                ></circle>
                <path
                  d="M4 50a46 46 0 0 1 92 0Z"
                  fill="var(--color-poke-red)"
                  stroke="var(--color-ink)"
                  strokeWidth="6"
                ></path>
                <line
                  x1="4"
                  y1="50"
                  x2="96"
                  y2="50"
                  stroke="var(--color-ink)"
                  strokeWidth="6"
                ></line>
                <circle
                  cx="50"
                  cy="50"
                  r="14"
                  fill="var(--color-cream)"
                  stroke="var(--color-ink)"
                  strokeWidth="6"
                ></circle>
                <circle
                  cx="50"
                  cy="50"
                  r="6"
                  fill="var(--color-cream)"
                  stroke="var(--color-ink)"
                  strokeWidth="3"
                ></circle>
              </svg>
              <span className="font-display text-lg leading-none text-cream drop-shadow-[2px_2px_0_var(--color-ink)] sm:text-xl">
                Poke Print Shop
              </span>
            </a>
            <nav
              aria-label="Main"
              className="flex items-center gap-1 text-sm font-semibold text-cream sm:gap-2"
            >
              <a
                href="#gallery"
                className="rounded-full px-3 py-1.5 transition-colors hover:bg-ink/30"
              >
                Gallery
              </a>
              <a
                href="#sizes"
                className="rounded-full px-3 py-1.5 transition-colors hover:bg-ink/30"
              >
                Sizes
              </a>
              <a
                href="/custom-artwork"
                className="rounded-full px-3 py-1.5 transition-colors hover:bg-ink/30"
              >
                Custom art
              </a>
            </nav>
          </div>
        </header>
        <main>
          <section className="relative overflow-hidden border-b-4 border-ink">
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
              <div className="flex flex-col items-start gap-6">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-poke-yellow px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-sparkles size-3.5"
                    aria-hidden="true"
                  >
                    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                    <path d="M20 2v4"></path>
                    <path d="M22 4h-4"></path>
                    <circle cx="4" cy="20" r="2"></circle>
                  </svg>
                  Handmade fan art prints
                </span>
                <h1 className="font-display text-4xl leading-tight text-balance text-cream sm:text-5xl lg:text-6xl">
                  Catch your favorite art,{" "}
                  <span className="text-poke-yellow drop-shadow-[3px_3px_0_var(--color-poke-red)]">
                    print it, frame it.
                  </span>
                </h1>
                <p className="max-w-md text-pretty text-lg leading-relaxed text-cream/75">
                  Original Pokemon-inspired artwork, printed and framed by hand.
                  From pocket-sized 4 x 4 prints to legendary 20 x 30 posters.
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
                    Sizes &amp; prices
                  </a>
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-md">
                <div
                  className="absolute -inset-4 -z-10 rotate-3 rounded-3xl bg-poke-yellow"
                  aria-hidden="true"
                ></div>
                <div className="overflow-hidden rounded-3xl border-4 border-ink bg-ink shadow-[8px_8px_0_var(--color-poke-red)]">
                  <div className="relative aspect-[4/5]">
                    <HeroImage />
                  </div>
                </div>
              </div>
            </div>
          </section>
          <Storefront />
          <CommunitySections />
        </main>
        <footer className="border-t-4 border-ink bg-ink">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-cream/60 sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 100 100" aria-hidden="true" className="size-6">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="var(--color-cream)"
                  stroke="var(--color-ink)"
                  strokeWidth="6"
                ></circle>
                <path
                  d="M4 50a46 46 0 0 1 92 0Z"
                  fill="var(--color-poke-red)"
                  stroke="var(--color-ink)"
                  strokeWidth="6"
                ></path>
                <line
                  x1="4"
                  y1="50"
                  x2="96"
                  y2="50"
                  stroke="var(--color-ink)"
                  strokeWidth="6"
                ></line>
                <circle
                  cx="50"
                  cy="50"
                  r="14"
                  fill="var(--color-cream)"
                  stroke="var(--color-ink)"
                  strokeWidth="6"
                ></circle>
                <circle
                  cx="50"
                  cy="50"
                  r="6"
                  fill="var(--color-cream)"
                  stroke="var(--color-ink)"
                  strokeWidth="3"
                ></circle>
              </svg>
              <span className="font-display text-cream">Poke Print Shop</span>
            </div>

            <p className="text-pretty">
              Fan art. Pokemon and related characters are trademarks of
              Nintendo, Game Freak, and Creatures Inc.
            </p>
          </div>
        </footer>
      </>
    </CatalogProvider>
  );
}
