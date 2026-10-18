import { connection } from 'next/server'
import { getArtworks } from '@/lib/artworks'
import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { Gallery } from '@/components/gallery'
import { SizeGuide } from '@/components/size-guide'
import { SiteFooter } from '@/components/site-footer'

export default async function Page() {
  await connection()
  const artworks = await getArtworks()

  return (
    <>
      <SiteHeader />
      <main>
        <Hero featuredImage={artworks[0]?.imageUrl} />
        <Gallery artworks={artworks} />
        <SizeGuide />
      </main>
      <SiteFooter />
    </>
  )
}
