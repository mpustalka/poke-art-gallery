import 'server-only'
import { del, list, put } from '@vercel/blob'

export type Artwork = {
  id: string
  title: string
  description: string
  shopUrl: string
  imageUrl: string
  createdAt: string
}

const META_PREFIX = 'artworks/meta/'
export const IMAGE_PREFIX = 'artworks/images/'

export async function getArtworks(): Promise<Artwork[]> {
  const { blobs } = await list({ prefix: META_PREFIX, limit: 1000 })
  const results = await Promise.all(
    blobs.map(async (blob) => {
      try {
        const res = await fetch(blob.url, { cache: 'no-store' })
        if (!res.ok) return null
        return (await res.json()) as Artwork
      } catch {
        return null
      }
    }),
  )
  return results
    .filter((a): a is Artwork => a !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function saveArtwork(artwork: Artwork) {
  await put(`${META_PREFIX}${artwork.id}.json`, JSON.stringify(artwork), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function removeArtwork(id: string) {
  const { blobs } = await list({ prefix: `${META_PREFIX}${id}.json` })
  const meta = blobs[0]
  if (!meta) return
  const res = await fetch(meta.url, { cache: 'no-store' })
  const artwork = res.ok ? ((await res.json()) as Artwork) : null
  await del([meta.url, ...(artwork?.imageUrl ? [artwork.imageUrl] : [])])
}
