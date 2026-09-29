type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const MailIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.5 7 7.4 5.2a2 2 0 0 0 2.2 0L20.5 7" />
  </svg>
);

export const LockIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="4" y="10" width="16" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
);

export const UserIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const PhoneIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="6" y="2.5" width="12" height="19" rx="3" />
    <path d="M10.5 18.5h3" />
  </svg>
);

export const EyeIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.4 4.1" />
    <path d="M6.5 7.9A15.6 15.6 0 0 0 2.5 12S6 18 12 18a9.3 9.3 0 0 0 3.4-.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const CheckIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m4.5 12.5 4.5 4.5 10-10.5" />
  </svg>
);

export const ShieldIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3l7 2.6v5.6c0 4.4-2.9 8-7 9.2-4.1-1.2-7-4.8-7-9.2V5.6z" />
  </svg>
);

export const ChartIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const BoltIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
  </svg>
);

export const ArrowLeftIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const GoogleIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
    <path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" />
    <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3 14.7 2 12 2a10 10 0 0 0-8.9 5.4L6.4 10C7.2 7.7 9.4 6 12 6z" />
  </svg>
);

export const AppleIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
    <path d="M16.4 12.8c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8s-1.8-.8-2.9-.8c-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7 2-1.1 2.7-2.2c.9-1.2 1.2-2.4 1.2-2.5 0 0-2.3-.9-2.3-3.7zM14.2 5.4c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.7-1.3z" />
  </svg>
);

export const BellIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 9a6 6 0 1 1 12 0c0 3.3.7 5 1.6 6H4.4C5.3 14 6 12.3 6 9Z" />
    <path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
  </svg>
);

export const GearIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.3 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.05-.06a1.6 1.6 0 0 0-1.78-.32 1.6 1.6 0 0 0-1 1.46V21a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-1H3a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.77.32H8.8a1.6 1.6 0 0 0 1-1.46V3a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 1 1.46 1.6 1.6 0 0 0 1.78-.32l.05-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.46 1H21a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.46 1Z" />
  </svg>
);

export const ChevronDownIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
);

export const HomeIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
  </svg>
);

export const WalletIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v1" />
    <rect x="3" y="8.5" width="18" height="11.5" rx="2.5" />
    <circle cx="16.5" cy="14.2" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const ReportIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v4h4M8.5 17v-3M12 17v-6M15.5 17v-4" />
  </svg>
);

export const SearchIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const TrendUpIcon = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3.5 16.5 9.5 10l4 4 7-7.5" />
    <path d="M15.5 6.5h5v5" />
  </svg>
);

export const TrendDownIcon = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3.5 7.5 9.5 14l4-4 7 7.5" />
    <path d="M15.5 17.5h5v-5" />
  </svg>
);

export const LogOutIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
    <path d="M15 8.5 18.5 12 15 15.5M18.5 12H9" />
  </svg>
);

export const IdIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="9" cy="11" r="2.2" />
    <path d="M5.6 16.4a3.6 3.6 0 0 1 6.8 0M14.5 10h4M14.5 13.5h4" />
  </svg>
);

export const PinIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const UsersIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="9.5" cy="8.5" r="3.4" />
    <path d="M3.5 19.5a6 6 0 0 1 12 0" />
    <path d="M16 5.6a3.4 3.4 0 0 1 0 6.6M17.5 14.4a6 6 0 0 1 3 5.1" />
  </svg>
);

export const PlusIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const RouteIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="6" cy="18" r="2.6" />
    <circle cx="18" cy="6" r="2.6" />
    <path d="M15.4 6H10a4 4 0 0 0 0 8h4a4 4 0 0 1 0 8" />
  </svg>
);

export const MenuIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const CameraIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 8.5h2.6l1.5-2.2h7.8l1.5 2.2H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5z" />
    <circle cx="12" cy="13.6" r="3.3" />
  </svg>
);

export const UploadIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 15.5V4M8.2 7.8 12 4l3.8 3.8" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
);

export const ImageIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="m3.6 17 4.6-4.4a2 2 0 0 1 2.7 0l3 2.9a2 2 0 0 0 2.7 0l3.4-3" />
  </svg>
);

export const CalculatorIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
    <rect x="8" y="5.5" width="8" height="3.5" rx="1" />
    <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" strokeWidth="2.4" />
  </svg>
);

export const LedgerIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 3h9l4 4v12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z" />
    <path d="M15 3v4h4M8.5 11.5h7M8.5 15h7M8.5 18h4" />
  </svg>
);

export const CheckCircleIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.3 12.3 2.6 2.6 4.9-5.2" />
  </svg>
);

export const ClockIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const SparkIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3.5 13.9 9a1.5 1.5 0 0 0 1 1l5.6 2-5.6 2a1.5 1.5 0 0 0-1 1L12 20.5 10.1 15a1.5 1.5 0 0 0-1-1L3.5 12l5.6-2a1.5 1.5 0 0 0 1-1z" />
    <path d="M19 3v3M17.5 4.5h3" />
  </svg>
);
