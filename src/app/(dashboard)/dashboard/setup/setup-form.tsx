'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { INDUSTRY_OPTIONS } from '@/lib/constants'

export function SetupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ name?: string; industry?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = 'Zadejte alespoň 2 znaky.'
    if (!industry) next.industry = 'Vyberte obor.'
    setErrors(next)
    if (next.name || next.industry) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), industry }),
      })
      // 409 = workspace už existuje, taky pokračujeme na dashboard
      if (!res.ok && res.status !== 409) throw new Error()
      router.push('/dashboard')
      router.refresh()
    } catch {
      setErrors({ form: 'Firmu se nepodařilo vytvořit. Zkuste to prosím znovu.' })
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vítejte v Receptio</CardTitle>
        <CardDescription>Řekněte nám něco o vaší firmě, ať můžeme nastavit asistenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Název firmy</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              autoFocus
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Obor</Label>
            <Select value={industry} onValueChange={setIndustry} items={INDUSTRY_OPTIONS}>
              <SelectTrigger className="w-full" aria-invalid={!!errors.industry}>
                <SelectValue placeholder="Vyberte obor" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.industry && <p className="text-sm text-destructive">{errors.industry}</p>}
          </div>
          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Vytvářím…' : 'Pokračovat'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
