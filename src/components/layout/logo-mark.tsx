/** Ikona loga (mikrofon v indigo čtverci), společná pro navbar a footer. */
export function LogoMark({ className = 'size-7' }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ${className}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <rect x="4" y="1" width="6" height="8" rx="3" fill="currentColor" />
        <path d="M2 7a5 5 0 0 0 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <line x1="7" y1="12" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}
