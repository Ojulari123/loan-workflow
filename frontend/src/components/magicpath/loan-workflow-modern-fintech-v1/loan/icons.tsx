import React from 'react';

// Lightweight inline icon set (stroke-based, currentColor) so the component has
// zero external icon dependencies and always builds.

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};
const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
});
export const IconApply = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    <path d="M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M9 13h6M9 17h4" />
  </svg>;
export const IconReview = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M12 2 4 5v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V5l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>;
export const IconOffer = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9v.01M18 15v.01" />
  </svg>;
export const IconRepay = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>;
export const IconCheck = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="m20 6-11 11-5-5" />
  </svg>;
export const IconCheckCircle = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.4 2.4L15.5 9.5" />
  </svg>;
export const IconX = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>;
export const IconArrowRight = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>;
export const IconArrowLeft = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>;
export const IconShield = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M12 2 4 5v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V5l-8-3Z" />
    <path d="M12 8v4M12 15.5v.01" />
  </svg>;
export const IconWallet = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2Z" />
    <path d="M17 13h.01" />
  </svg>;
export const IconSpark = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" />
  </svg>;
export const IconLock = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>;
export const IconTrophy = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    <path d="M12 14v3M9 21h6M10 21v-1.5a2 2 0 0 1 4 0V21" />
  </svg>;
export const IconInfo = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>;
export const IconUser = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </svg>;
export const IconBriefcase = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
  </svg>;
export const IconBell = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>;
export const IconInbox = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M4 13h4l2 3h4l2-3h4" />
    <path d="M4 13 6 5h12l2 8v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z" />
  </svg>;
export const IconChevronRight = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>;
export const IconChevronLeft = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="m15 6-6 6 6 6" />
  </svg>;
export const IconClock = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>;
export const IconLayers = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5M3 16.5l9 5 9-5" />
  </svg>;
export const IconMail = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>;
export const IconHome = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>;
export const IconChat = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4A8 8 0 1 1 21 11.5Z" />
    <path d="M8.5 11h7M8.5 14h4" />
  </svg>;
export const IconSend = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M11 13 21 3M21 3l-6.5 18-3.5-8-8-3.5L21 3Z" />
  </svg>;
export const IconChart = ({
  size = 24,
  ...p
}: IconProps) => <svg {...base(size)} {...p}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 15v-3M12 15V9M17 15v-6" />
  </svg>;
export const IconLogo = ({
  size = 24,
  ...p
}: IconProps) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
    <path d="M7 16V8l5 5 5-5v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  
  </svg>;