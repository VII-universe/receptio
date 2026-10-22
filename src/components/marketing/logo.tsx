import { cn } from '@/lib/utils'

/** Logo veřejného webu: malý „orb“ Aidy a slovo Receptio. Barvu bere z okolního textu. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-grotesk text-[1.375rem] font-semibold tracking-[-0.03em]', className)}>
      <span aria-hidden className="relative inline-block size-[1.1rem]">
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd2b0,#ff8a4c_45%,#e0622a_75%)]" />
        <span className="absolute -inset-1 rounded-full bg-aida/25 blur-[6px]" />
      </span>
      Receptio
    </span>
  )
}
