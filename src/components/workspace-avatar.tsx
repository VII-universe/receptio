import { cn } from '@/lib/utils'

/** Logo podniku, nebo počáteční písmeno názvu na barevné dlaždici, když logo není nahrané. */
export function WorkspaceAvatar({ name, logoUrl, className }: { name: string; logoUrl?: string | null; className?: string }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  return (
    <span className={cn('relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-semibold text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/10', className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full bg-white object-cover" loading="lazy" decoding="async" />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </span>
  )
}
