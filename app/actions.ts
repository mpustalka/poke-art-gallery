'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { IMAGE_PREFIX, removeArtwork, saveArtwork } from '@/lib/artworks'
import { createSession, destroySession, isAdmin, isAuthConfigured, verifyPassword } from '@/lib/auth'

export type FormState = { error?: string; success?: boolean }

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isAuthConfigured()) return { error: 'Admin password has not been configured yet.' }
  const password = String(formData.get('password') ?? '')
  if (!password || !verifyPassword(password)) return { error: 'Incorrect password.' }
  await createSession()
  redirect('/admin')
}

export async function logout() {
  await destroySession()
  redirect('/admin')
}

function isValidBlobImage(url: string) {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.public.blob.vercel-storage.com') &&
      parsed.pathname.startsWith(`/${IMAGE_PREFIX}`)
    )
  } catch {
    return false
  }
}

function normalizeShopUrl(value: string) {
  if (!value) return ''
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

export async function createArtwork(input: {
  title: string
  description: string
  shopUrl: string
  imageUrl: string
}): Promise<FormState> {
  if (!(await isAdmin())) return { error: 'You are not signed in.' }

  const title = input.title.trim().slice(0, 120)
  const description = input.description.trim().slice(0, 600)
  const shopUrl = normalizeShopUrl(input.shopUrl.trim())

  if (!title) return { error: 'Please add a title.' }
  if (shopUrl === null) return { error: 'Shop link must be a valid https:// URL.' }
  if (!isValidBlobImage(input.imageUrl)) return { error: 'Invalid image upload.' }

  await saveArtwork({
    id: randomUUID(),
    title,
    description,
    shopUrl,
    imageUrl: input.imageUrl,
    createdAt: new Date().toISOString(),
  })

  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteArtwork(formData: FormData) {
  if (!(await isAdmin())) return
  const id = String(formData.get('id') ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return
  await removeArtwork(id)
  revalidatePath('/')
  revalidatePath('/admin')
}
