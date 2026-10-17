import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const Svg = ({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
    {children}
  </svg>
)

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export const PlayIcon = (props: IconProps) => (
  <Svg {...props} fill="currentColor">
    <path d="M7 4.6v14.8a1 1 0 0 0 1.52.85l12.1-7.4a1 1 0 0 0 0-1.7L8.52 3.75A1 1 0 0 0 7 4.6z" />
  </Svg>
)

export const PauseIcon = (props: IconProps) => (
  <Svg {...props} fill="currentColor">
    <rect x="5.5" y="4" width="4.5" height="16" rx="1.2" />
    <rect x="14" y="4" width="4.5" height="16" rx="1.2" />
  </Svg>
)

export const NextIcon = (props: IconProps) => (
  <Svg {...props} fill="currentColor">
    <path d="M4.5 5.2a1 1 0 0 1 1.55-.83l9.7 6.8a1 1 0 0 1 0 1.66l-9.7 6.8a1 1 0 0 1-1.55-.83z" />
    <rect x="17" y="4.2" width="2.5" height="15.6" rx="1.25" />
  </Svg>
)

export const PrevIcon = (props: IconProps) => (
  <Svg {...props} fill="currentColor">
    <g transform="matrix(-1 0 0 1 24 0)">
      <path d="M4.5 5.2a1 1 0 0 1 1.55-.83l9.7 6.8a1 1 0 0 1 0 1.66l-9.7 6.8a1 1 0 0 1-1.55-.83z" />
      <rect x="17" y="4.2" width="2.5" height="15.6" rx="1.25" />
    </g>
  </Svg>
)

export const ShuffleIcon = (props: IconProps) => (
  <Svg {...props} {...stroke}>
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="m4 4 5 5" />
  </Svg>
)

export const RepeatIcon = ({ one, ...props }: IconProps & { one?: boolean }) => (
  <Svg {...props} {...stroke}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    {one && <path d="M11 10h1v4" />}
  </Svg>
)

export const VolumeIcon = ({ level, ...props }: IconProps & { level: 'mute' | 'low' | 'high' }) => (
  <Svg {...props} {...stroke}>
    <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
    {level === 'mute' && <path d="m16 9 6 6m0-6-6 6" />}
    {level !== 'mute' && <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
    {level === 'high' && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}
  </Svg>
)

export const SearchIcon = (props: IconProps) => (
  <Svg {...props} {...stroke}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </Svg>
)

export const CloseIcon = (props: IconProps) => (
  <Svg {...props} {...stroke}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const LibraryIcon = (props: IconProps) => (
  <Svg {...props} {...stroke}>
    <path d="M4 3v18" />
    <path d="M9 3v18" />
    <path d="m14 3.5 6 17" />
  </Svg>
)

export const QueueIcon = (props: IconProps) => (
  <Svg {...props} {...stroke}>
    <path d="M3 6h14" />
    <path d="M3 12h9" />
    <path d="M3 18h9" />
    <path d="M16 13.5v7l5.5-3.5z" fill="currentColor" />
  </Svg>
)

export const ChevronDownIcon = (props: IconProps) => (
  <Svg {...props} {...stroke}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const NoteIcon = (props: IconProps) => (
  <Svg {...props} {...stroke}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Svg>
)

export const LogoIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="12" fill="#1ed760" />
    <rect x="6" y="9" width="2.6" height="6" rx="1.3" fill="#000" />
    <rect x="10.7" y="5.5" width="2.6" height="13" rx="1.3" fill="#000" />
    <rect x="15.4" y="7.8" width="2.6" height="8.4" rx="1.3" fill="#000" />
  </Svg>
)
