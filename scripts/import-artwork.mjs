import { put, list } from '@vercel/blob'

const B = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/'

const groups = [
  {
    id: 'scyther',
    title: 'Scyther',
    description: 'Frenzied ink sketch of Scyther mid-strike, wings spread and scythes swinging.',
    featured: 'Scyther-3-ZYFyUtNUUpbSsGyJXfWfNz2WWv6pxe.webp',
    extras: [
      'Scyther-2-Pmu7Km9Dumvre5p6oBA696LsChNjTv.webp',
      'Screenshot%202026-10-18%20at%2017-43-00%201792287501.webp%20%28WEBP%20Image%20533%20%C3%97%20800%20pixels%29-0OshaX3woJD6XLwFR5cGyzgqQO64rs.png',
    ],
  },
  {
    id: 'blastoise',
    title: 'Blastoise',
    description: 'Heavy cross-hatched ink Blastoise with its cannons loaded, signed by the artist.',
    featured: 'Blastoise%20-3-zzzLwXgcMJaLMlZv942u22M5eU0Aq8.webp',
    extras: [
      'Blastoise%20-4-5VbnJv9irvDS6Y26jNMZbMi7c7LQ3F.webp',
      'Blastoise%20-2-tclyVRiZrFBnP5dUQQszp4xrecFIxn.webp',
      'Blastoise%20-1-vNZkw04XWGlTpiCXbIYq01kst1IUPH.webp',
    ],
  },
  {
    id: 'arcanine',
    title: 'Arcanine',
    description: 'Arcanine charging through tall grass, drawn in fast, windswept ink strokes.',
    featured: 'arcanine-2-PgsXQkUFFa5jlSJ7rKn7cWJG9yo6En.webp',
    extras: [
      'arcanine-1-48z5jtC16Omg3mApLcWUe1qBTiTWe9.webp',
      'Screenshot%202026-10-18%20at%2017-39-53%201792351132.webp%20%28WEBP%20Image%20600%20%C3%97%20800%20pixels%29-Xe2cRzXpEJ2qiTStML6slQCrtsPsoq.png',
    ],
  },
  {
    id: 'dragonite',
    title: 'Dragonite',
    description: 'Soft pencil Dragonite soaring through a starry night sky under a crescent moon.',
    featured: 'dragonite-best-3-jUPqXnlrsvXHIc3RKLQdxPV9Va4QF3.webp',
    extras: [
      'dragonite-4-2MpCb8su4VtpI5htmlJhTMgPl4ejIN.webp',
      'dragonite-2-We1cuNXwAgBOMFOX3qF9bJRvWly7WY.webp',
      'dragonite-1-AbEG5v0k5xNBEfHye2qOXukxTc5ia8.webp',
      'Screenshot%202026-10-18%20at%2017-36-47%201792351179.webp%20%28WEBP%20Image%20600%20%C3%97%20800%20pixels%29-M38a7OkLVBNVh3LzoN5TfhkICNh8CX.png',
    ],
  },
  {
    id: 'pikachu',
    title: 'Pikachu',
    description: 'A curious Pikachu beneath a towering tree in a moody black-and-white landscape.',
    featured: 'pikachu-best-nkXghZNi8mcKfvDED9qXZRZNY45jI5.webp',
    extras: [
      'Screenshot%202026-10-18%20at%2017-38-58%20Pokemon%20Custom%20Artwork%20Framed%20-%20Pikachu%20Vinted-Evw0TvkDKRwNxgNeRXF3yWNEEL6Rhg.png',
      'Screenshot%202026-10-18%20at%2017-39-21%201792333105.webp%20%28WEBP%20Image%20600%20%C3%97%20800%20pixels%29%20%E2%80%94%20Scaled%20%2894_%29-87wLOT3Bx3QQ4mgLRzSInWf8wZbvUR.png',
    ],
  },
]

async function copy(file, dest) {
  const res = await fetch(B + file)
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${file}`)
  const contentType = res.headers.get('content-type') ?? 'image/webp'
  const ext = contentType.includes('png') ? 'png' : 'webp'
  const blob = await put(`${dest}.${ext}`, Buffer.from(await res.arrayBuffer()), {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  })
  return blob.url
}

const existing = await list({ prefix: 'artworks/meta/' })
const existingIds = new Set(existing.blobs.map((b) => b.pathname.replace('artworks/meta/', '').replace('.json', '')))

const base = Date.now()
for (const [i, g] of groups.entries()) {
  if (existingIds.has(g.id)) {
    console.log(`skip ${g.id} (exists)`)
    continue
  }
  const imageUrl = await copy(g.featured, `artworks/images/${g.id}`)
  for (const [j, extra] of g.extras.entries()) {
    await copy(extra, `artworks/extras/${g.id}-${j + 1}`)
  }
  const artwork = {
    id: g.id,
    title: g.title,
    description: g.description,
    shopUrl: '',
    imageUrl,
    createdAt: new Date(base - i * 1000).toISOString(),
  }
  await put(`artworks/meta/${g.id}.json`, JSON.stringify(artwork), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  console.log(`saved ${g.id} + ${g.extras.length} extras`)
}
