import { cn } from '@/lib/utils'

/**
 * Statický orb Aidy (jen CSS). Slouží jako zástupný obraz stejné velikosti, dokud se nenačte
 * živý orb, a jako náhrada tam, kde se živý nevykresluje.
 */
export function OrbStatic({ tint = '#ff8a4c', className }: { tint?: string; className?: string }) {
  return (
    <div aria-hidden className={cn('relative aspect-square w-full', className)} style={{ '--tint': tint } as React.CSSProperties}>
      <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--tint)_55%,transparent)_0%,transparent_68%)] blur-2xl" />
      <div className="absolute inset-[20%] rounded-full bg-[radial-gradient(circle_at_36%_30%,#fff1e4_0%,color-mix(in_srgb,var(--tint)_80%,#ffd9bd)_32%,var(--tint)_58%,color-mix(in_srgb,var(--tint)_70%,#8a2d0c)_100%)] shadow-[inset_-18px_-24px_60px_rgb(120_40_10/0.35),inset_12px_14px_40px_rgb(255_255_255/0.5)]" />
      <div className="absolute inset-[26%] rounded-full bg-[radial-gradient(circle_at_30%_25%,rgb(255_255_255/0.75),transparent_40%)] mix-blend-soft-light" />
    </div>
  )
}
