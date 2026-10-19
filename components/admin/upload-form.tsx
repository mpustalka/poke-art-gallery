'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { ImagePlus, Upload } from 'lucide-react'
import { createArtwork } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function UploadForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [progress, setProgress] = useState<number | null>(null)

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (preview) URL.revokeObjectURL(preview)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get('image')
    if (!(file instanceof File) || file.size === 0) {
      setStatus({ type: 'error', message: 'Please choose an image.' })
      return
    }

    setStatus(null)
    setProgress(0)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const blob = await upload(`artworks/images/${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      })

      const result = await createArtwork({
        title: String(data.get('title') ?? ''),
        description: String(data.get('description') ?? ''),
        shopUrl: String(data.get('shopUrl') ?? ''),
        imageUrl: blob.url,
      })

      if (result.error) {
        setStatus({ type: 'error', message: result.error })
      } else {
        setStatus({ type: 'success', message: 'Artwork uploaded!' })
        formRef.current?.reset()
        if (preview) URL.revokeObjectURL(preview)
        setPreview(null)
        router.refresh()
      }
    } catch (error) {
      setStatus({ type: 'error', message: (error as Error).message || 'Upload failed.' })
    } finally {
      setProgress(null)
    }
  }

  const uploading = progress !== null

  return (
    <section aria-labelledby="upload-heading" className="rounded-3xl border-4 border-ink bg-card p-6 shadow-[6px_6px_0_var(--color-poke-red)]">
      <h2 id="upload-heading" className="font-display text-xl text-cream">
        Upload new artwork
      </h2>
      <form ref={formRef} onSubmit={handleSubmit} className="mt-5 grid gap-6 md:grid-cols-[220px_1fr]">
        <label
          htmlFor="image"
          className="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-4 border-dashed border-cream/30 bg-ink/40 text-center text-sm text-cream/70 transition-colors hover:border-poke-yellow"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected artwork preview" className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <ImagePlus className="size-8 text-poke-yellow" aria-hidden="true" />
              <span>Click to choose an image</span>
              <span className="text-xs text-cream/50">JPG, PNG, WEBP up to 25MB</span>
            </>
          )}
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleFileChange}
            required
          />
        </label>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="text-cream">
              Title
            </Label>
            <Input id="title" name="title" maxLength={120} placeholder="Charizard Sunset" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description" className="text-cream">
              Description <span className="text-cream/50">(optional)</span>
            </Label>
            <Textarea id="description" name="description" maxLength={600} rows={3} placeholder="Watercolor style, available in all sizes." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="shopUrl" className="text-cream">
              Shopify product link <span className="text-cream/50">(optional)</span>
            </Label>
            <Input id="shopUrl" name="shopUrl" type="url" placeholder="https://your-store.myshopify.com/products/..." />
          </div>

          {status ? (
            <p
              role={status.type === 'error' ? 'alert' : 'status'}
              className={status.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-poke-yellow'}
            >
              {status.message}
            </p>
          ) : null}

          <Button type="submit" disabled={uploading} className="self-start bg-poke-red font-bold text-cream hover:bg-poke-red/90">
            <Upload aria-hidden="true" />
            {uploading ? `Uploading... ${Math.round(progress)}%` : 'Upload artwork'}
          </Button>
        </div>
      </form>
    </section>
  )
}
