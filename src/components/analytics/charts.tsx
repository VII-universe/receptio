'use client'

import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

const BLUE = '#3b82f6'

/** Recharts měří rozměry až v prohlížeči; do té doby (a při hydrataci) se ukazuje skeleton. */
function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

const ddMM = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
const plural = (n: number) => (n === 1 ? 'hovor' : n >= 2 && n <= 4 ? 'hovory' : 'hovorů')

export function CallsByDayChart({ data }: { data: { date: string; count: number; minutes: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return <Skeleton className="h-64 w-full rounded-xl" />

  // Osa X má nejvýše ~10 popisků (u 90 dní se mezilehlé přeskakují).
  const interval = Math.max(0, Math.ceil(data.length / 10) - 1)

  return (
    <div className="h-64 min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis dataKey="date" tickFormatter={ddMM} interval={interval} tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(59,130,246,0.08)' }}
            labelFormatter={(d) => ddMM(String(d))}
            formatter={(value, _name, item) => [
              `${value} ${plural(Number(value))} · ${(item.payload as { minutes: number }).minutes} min`,
              'Hovory',
            ]}
          />
          <Bar dataKey="count" fill={BLUE} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CallsByHourChart({ data }: { data: { hour: number; count: number }[] }) {
  const mounted = useMounted()
  if (!mounted) return <Skeleton className="h-64 w-full rounded-xl" />

  return (
    <div className="h-64 min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
          <XAxis dataKey="hour" interval={1} tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            labelFormatter={(h) => `${h}:00–${h}:59`}
            formatter={(value) => [`${value} ${plural(Number(value))}`, 'Hovory']}
          />
          <Line type="monotone" dataKey="count" stroke={BLUE} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
