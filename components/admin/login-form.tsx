'use client'

import { useActionState } from 'react'
import { login, type FormState } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pokeball } from '@/components/pokeball'

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {})

  return (
    <div className="w-full max-w-sm rounded-3xl border-4 border-ink bg-poke-red p-1 shadow-[8px_8px_0_var(--color-ink)]">
      <div className="flex flex-col items-center gap-2 px-6 pb-4 pt-6 text-center">
        <Pokeball className="size-14" />
        <h1 className="font-display text-2xl text-cream">Trainer Login</h1>
        <p className="text-sm text-cream/80">Sign in to manage your artwork.</p>
      </div>
      <form action={action} className="flex flex-col gap-4 rounded-[1.25rem] bg-card p-6">
        {!configured ? (
          <p role="alert" className="rounded-lg bg-poke-yellow/15 p-3 text-sm text-poke-yellow">
            Set an <code className="font-mono">ADMIN_PASSWORD</code> environment variable in the Vars panel to enable
            admin login.
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-cream">
            Password
          </Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || !configured} className="bg-poke-yellow font-bold text-ink hover:bg-poke-yellow/90">
          {pending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
