import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { IMAGE_PREFIX } from '@/lib/artworks'
import { isAdmin } from '@/lib/auth'

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) throw new Error('Unauthorized')
        if (!pathname.startsWith(IMAGE_PREFIX)) throw new Error('Invalid path')
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
