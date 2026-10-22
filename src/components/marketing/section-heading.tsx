import { cn } from '@/lib/utils'

/** Nadpis sekce: štítek, velký nadpis a volitelný úvodní odstavec. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  className,
  titleId,
}: {
  eyebrow: string
  title: React.ReactNode
  lead?: React.ReactNode
  align?: 'left' | 'center'
  className?: string
  titleId?: string
}) {
  return (
    <div className={cn('flex flex-col gap-6', align === 'center' && 'items-center text-center', className)}>
      <p className="mk-eyebrow">{eyebrow}</p>
      <h2 id={titleId} className="mk-display mk-h2 max-w-[18ch]">
        {title}
      </h2>
      {lead && <p className="mk-lead max-w-[44ch]">{lead}</p>}
    </div>
  )
}
