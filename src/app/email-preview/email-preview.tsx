'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PreviewEmail {
  id: string
  label: string
  html: string
}

export function EmailPreview({ emails }: { emails: PreviewEmail[] }) {
  const [id, setId] = useState(emails[0].id)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [copied, setCopied] = useState(false)
  const current = emails.find((e) => e.id === id) ?? emails[0]

  async function copy() {
    try {
      await navigator.clipboard.writeText(current.html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.alert('Kopírování se nezdařilo.')
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Email preview (jen development)</h1>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={id}
          items={emails.map((e) => ({ value: e.id, label: e.label }))}
          onValueChange={(v) => v && setId(v)}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {emails.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant={device === 'desktop' ? 'default' : 'outline'} onClick={() => setDevice('desktop')}>
            Desktop
          </Button>
          <Button size="sm" variant={device === 'mobile' ? 'default' : 'outline'} onClick={() => setDevice('mobile')}>
            Mobile
          </Button>
        </div>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? 'Zkopírováno' : 'Kopírovat HTML'}
        </Button>
      </div>
      <div className="flex justify-center rounded-lg border bg-muted/40 p-4">
        <iframe
          key={`${id}-${device}`}
          title={current.label}
          srcDoc={current.html}
          // sandbox bez skriptů: náhled nikdy nespouští kód z e-mailu
          sandbox=""
          style={{ width: device === 'desktop' ? 600 : 390, maxWidth: '100%', height: 800, border: 0, background: '#fff' }}
        />
      </div>
    </div>
  )
}
