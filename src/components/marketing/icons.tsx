// Vlastní tenké linkové ikony veřejného webu (24 × 24, tah 1,5). Dekorativní: aria-hidden, popis nese okolní text.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.5 5.2v13.6a.8.8 0 0 0 1.2.7l11-6.8a.8.8 0 0 0 0-1.4l-11-6.8a.8.8 0 0 0-1.2.7Z" fill="currentColor" stroke="none" />
  </Svg>
)
export const IconPause = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
  </Svg>
)
export const IconReplay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
    <path d="M4.5 4.5v3.8h3.8" />
  </Svg>
)
export const IconVolume = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5h3l4.5-4v13L7 14.5H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Svg>
)
export const IconVolumeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5h3l4.5-4v13L7 14.5H4z" />
    <path d="m16 9.5 5 5m0-5-5 5" />
  </Svg>
)
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.2 4.2L19 7" />
  </Svg>
)
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h15m-5.5-6 6 6-6 6" />
  </Svg>
)
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8h16M4 16h16" />
  </Svg>
)
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
)
export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Svg>
)
export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.6 3.8h2.5l1.4 4.1-2 1.3a10.6 10.6 0 0 0 6.3 6.3l1.3-2 4.1 1.4v2.5a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 4.6 6a2 2 0 0 1 2-2.2Z" />
  </Svg>
)
export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)
export const IconForward = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h12m-4-5 5 5-5 5" />
    <path d="M20 5v14" />
  </Svg>
)
export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="m4.5 7 7.5 6 7.5-6" />
  </Svg>
)
export const IconMessage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" />
    <path d="M8 10h8M8 13h5" />
  </Svg>
)
export const IconDatabase = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="2.5" />
    <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
  </Svg>
)
export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
  </Svg>
)
export const IconWaves = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12h1.5M6.5 9v6M10 6v12M13.5 8.5v7M17 10.5v3M20.5 12H21" />
  </Svg>
)
export const IconSliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 7h9M18 7h1M5 17h1M10 17h9" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Svg>
)

// Odvětví
export const IconCup = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 9.5h12v4a6 6 0 0 1-12 0z" />
    <path d="M16.5 10.5h1.2a2.3 2.3 0 0 1 0 4.6h-1.6M8 3.5c-.6.8-.6 1.7 0 2.5M12 3.5c-.6.8-.6 1.7 0 2.5M4 21h13" />
  </Svg>
)
export const IconTooth = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6.2c-1.4-1.3-3.6-2.1-5.4-1.2-2.4 1.2-2.4 4.6-1.3 7.3.8 1.9 1.1 3.6 1.4 5.9.2 1.6 1.9 2 2.5.5l1.2-3.4c.4-1.1 2.8-1.1 3.2 0l1.2 3.4c.6 1.5 2.3 1.1 2.5-.5.3-2.3.6-4 1.4-5.9 1.1-2.7 1.1-6.1-1.3-7.3-1.8-.9-4-.1-5.4 1.2Z" />
  </Svg>
)
export const IconWrench = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.8 4.2a4.6 4.6 0 0 0-5.6 6l-5.4 5.4a2 2 0 0 0 2.8 2.8l5.4-5.4a4.6 4.6 0 0 0 6-5.6l-2.8 2.8-2.6-.6-.6-2.6Z" />
  </Svg>
)
export const IconScissors = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.5" cy="7" r="2.5" />
    <circle cx="6.5" cy="17" r="2.5" />
    <path d="M8.6 8.4 19.5 18M8.6 15.6 19.5 6" />
  </Svg>
)
