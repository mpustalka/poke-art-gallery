import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { connection } from 'next/server'
import { ExternalLink, LogOut, Trash2 } from 'lucide-react'
import { deleteArtwork, logout } from '@/app/actions'
import { getArtworks } from '@/lib/artworks'
import { isAdmin, isAuthConfigured } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/admin/login-form'
import { UploadForm } from '@/components/admin/upload-form'
import { Pokeball } from '@/components/pokeball'

export const metadata: Metadata = {
  title: 'Admin | Poke Print Shop',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  await connection()

  if (!(await isAdmin())) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 py-12">
        <LoginForm configured={isAuthConfigured()} />
      </main>
    )
  }

  const artworks = await getArtworks()

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Pokeball className="size-10" />
          <div>
            <h1 className="font-display text-2xl text-cream">Artwork Manager</h1>
            <p className="text-sm text-cream/60">Upload and manage the prints shown on your site.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/" />}>
            View site
          </Button>
          <form action={logout}>
            <Button type="submit" variant="ghost" className="text-cream">
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <UploadForm />

      <section aria-labelledby="artworks-heading" className="flex flex-col gap-4">
        <h2 id="artworks-heading" className="font-display text-xl text-cream">
          Your artwork ({artworks.length})
        </h2>
        {artworks.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-cream/25 p-8 text-center text-cream/60">
            No artwork yet. Upload your first piece above.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((art) => (
              <li key={art.id} className="flex flex-col overflow-hidden rounded-2xl border-4 border-ink bg-card">
                <div className="relative aspect-square bg-ink">
                  <Image src={art.imageUrl} alt={art.title} fill sizes="320px" className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="font-semibold text-cream">{art.title}</h3>
                  {art.shopUrl ? (
                    <a
                      href={art.shopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 truncate text-xs text-poke-yellow hover:underline"
                    >
                      <ExternalLink className="size-3" aria-hidden="true" />
                      Shopify link
                    </a>
                  ) : (
                    <span className="text-xs text-cream/50">No shop link</span>
                  )}
                  <form action={deleteArtwork} className="mt-auto pt-2">
                    <input type="hidden" name="id" value={art.id} />
                    <Button type="submit" variant="destructive" size="sm" className="w-full">
                      <Trash2 aria-hidden="true" />
                      Delete
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
