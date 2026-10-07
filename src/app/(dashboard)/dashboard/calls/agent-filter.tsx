'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function AgentFilter({
  agents,
  selected,
}: {
  agents: { id: string; name: string }[]
  selected: string | null
}) {
  const router = useRouter()
  const t = useTranslations('calls')
  const items = [{ value: 'all', label: t('allAgents') }, ...agents.map((a) => ({ value: a.id, label: a.name }))]

  return (
    <Select
      value={selected ?? 'all'}
      items={items}
      onValueChange={(v) => router.push(v && v !== 'all' ? `/dashboard/calls?agent=${v}` : '/dashboard/calls')}
    >
      <SelectTrigger className="w-52">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
