import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

type Props = { size?: number; color?: string };

const stroke = {
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

export const MailIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="5" width="18" height="14" rx="2.5" stroke={color} {...stroke} />
    <Path d="m3.5 7 7.4 5.2a2 2 0 0 0 2.2 0L20.5 7" stroke={color} {...stroke} />
  </Svg>
);

export const LockIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="4" y="10" width="16" height="10.5" rx="2.5" stroke={color} {...stroke} />
    <Path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke={color} {...stroke} />
  </Svg>
);

export const UserIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="8.5" r="3.8" stroke={color} {...stroke} />
    <Path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke={color} {...stroke} />
  </Svg>
);

export const PhoneIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="6" y="2.5" width="12" height="19" rx="3" stroke={color} {...stroke} />
    <Path d="M10.5 18.5h3" stroke={color} {...stroke} />
  </Svg>
);

export const EyeIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke={color} {...stroke} />
    <Circle cx="12" cy="12" r="3" stroke={color} {...stroke} />
  </Svg>
);

export const EyeOffIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 3l18 18" stroke={color} {...stroke} />
    <Path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.4 4.1" stroke={color} {...stroke} />
    <Path d="M6.5 7.9A15.6 15.6 0 0 0 2.5 12S6 18 12 18a9.3 9.3 0 0 0 3.4-.6" stroke={color} {...stroke} />
    <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke={color} {...stroke} />
  </Svg>
);

export const CheckIcon = ({ size = 18, color = colors.success }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="m4.5 12.5 4.5 4.5 10-10.5" stroke={color} {...stroke} strokeWidth={2.2} />
  </Svg>
);

export const ArrowLeftIcon = ({ size = 18, color = colors.brand }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M19 12H5M11 6l-6 6 6 6" stroke={color} {...stroke} />
  </Svg>
);

export const GoogleIcon = ({ size = 18 }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z" />
    <Path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
    <Path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" />
    <Path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 3 14.7 2 12 2a10 10 0 0 0-8.9 5.4L6.4 10C7.2 7.7 9.4 6 12 6z" />
  </Svg>
);

export const AppleIcon = ({ size = 18, color = colors.text }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M16.4 12.8c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8s-1.8-.8-2.9-.8c-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7 2-1.1 2.7-2.2c.9-1.2 1.2-2.4 1.2-2.5 0 0-2.3-.9-2.3-3.7zM14.2 5.4c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.7-1.3z"
    />
  </Svg>
);

export const BellIcon = ({ size = 20, color = colors.textMuted }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 9a6 6 0 1 1 12 0c0 3.3.7 5 1.6 6H4.4C5.3 14 6 12.3 6 9Z" stroke={color} {...stroke} />
    <Path d="M10 18.5a2.2 2.2 0 0 0 4 0" stroke={color} {...stroke} />
  </Svg>
);

export const GearIcon = ({ size = 20, color = colors.textMuted }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="3.2" stroke={color} {...stroke} />
    <Path
      d="M19.4 15a1.7 1.7 0 0 0 .34 1.87 1.95 1.95 0 1 1-2.76 2.76A1.7 1.7 0 0 0 15.1 19.3a1.7 1.7 0 0 0-1.03 1.55v.15a1.95 1.95 0 1 1-3.9 0v-.08a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34 1.95 1.95 0 1 1-2.76-2.76A1.7 1.7 0 0 0 4.77 15a1.7 1.7 0 0 0-1.55-1.03H3.07a1.95 1.95 0 1 1 0-3.9h.08A1.7 1.7 0 0 0 4.7 8.96a1.7 1.7 0 0 0-.34-1.87 1.95 1.95 0 1 1 2.76-2.76A1.7 1.7 0 0 0 8.99 4.7h.08a1.7 1.7 0 0 0 1.03-1.55V3.07a1.95 1.95 0 1 1 3.9 0v.08a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.87-.34 1.95 1.95 0 1 1 2.76 2.76A1.7 1.7 0 0 0 19.3 8.99v.08a1.7 1.7 0 0 0 1.55 1.03h.15a1.95 1.95 0 1 1 0 3.9h-.08A1.7 1.7 0 0 0 19.4 15Z"
      stroke={color}
      {...stroke}
    />
  </Svg>
);

export const ChevronDownIcon = ({ size = 16, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="m6 9.5 6 6 6-6" stroke={color} {...stroke} />
  </Svg>
);

export const HomeIcon = ({ size = 22, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" stroke={color} {...stroke} />
  </Svg>
);

export const WalletIcon = ({ size = 22, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v1" stroke={color} {...stroke} />
    <Rect x="3" y="8.5" width="18" height="11.5" rx="2.5" stroke={color} {...stroke} />
    <Circle cx="16.5" cy="14.2" r="1.2" fill={color} />
  </Svg>
);

export const ReportIcon = ({ size = 22, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke={color} {...stroke} />
    <Path d="M14 3v4h4M8.5 17v-3M12 17v-6M15.5 17v-4" stroke={color} {...stroke} />
  </Svg>
);

export const SearchIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="11" cy="11" r="6.5" stroke={color} {...stroke} />
    <Path d="m16 16 4.5 4.5" stroke={color} {...stroke} />
  </Svg>
);

export const TrendUpIcon = ({ size = 14, color = colors.success }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3.5 16.5 9.5 10l4 4 7-7.5" stroke={color} {...stroke} />
    <Path d="M15.5 6.5h5v5" stroke={color} {...stroke} />
  </Svg>
);

export const TrendDownIcon = ({ size = 14, color = colors.danger }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3.5 7.5 9.5 14l4-4 7 7.5" stroke={color} {...stroke} />
    <Path d="M15.5 17.5h5v-5" stroke={color} {...stroke} />
  </Svg>
);

export const LogOutIcon = ({ size = 16, color = colors.danger }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" stroke={color} {...stroke} />
    <Path d="M15 8.5 18.5 12 15 15.5M18.5 12H9" stroke={color} {...stroke} />
  </Svg>
);

export const IdIcon = ({ size = 16, color = colors.textMuted }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="5" width="18" height="14" rx="2.5" stroke={color} {...stroke} />
    <Circle cx="9" cy="11" r="2.2" stroke={color} {...stroke} />
    <Path d="M5.6 16.4a3.6 3.6 0 0 1 6.8 0M14.5 10h4M14.5 13.5h4" stroke={color} {...stroke} />
  </Svg>
);

export const PinIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" stroke={color} {...stroke} />
    <Circle cx="12" cy="10" r="2.6" stroke={color} {...stroke} />
  </Svg>
);

export const UsersIcon = ({ size = 18, color = colors.brand }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="9.5" cy="8.5" r="3.4" stroke={color} {...stroke} />
    <Path d="M3.5 19.5a6 6 0 0 1 12 0" stroke={color} {...stroke} />
    <Path d="M16 5.6a3.4 3.4 0 0 1 0 6.6M17.5 14.4a6 6 0 0 1 3 5.1" stroke={color} {...stroke} />
  </Svg>
);

export const PlusIcon = ({ size = 18, color = colors.brand }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 5v14M5 12h14" stroke={color} {...stroke} />
  </Svg>
);

export const RouteIcon = ({ size = 18, color = colors.brand }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="6" cy="18" r="2.6" stroke={color} {...stroke} />
    <Circle cx="18" cy="6" r="2.6" stroke={color} {...stroke} />
    <Path d="M15.4 6H10a4 4 0 0 0 0 8h4a4 4 0 0 1 0 8" stroke={color} {...stroke} />
  </Svg>
);

export const CameraIcon = ({ size = 18, color = colors.brand }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M4 8.5h2.6l1.5-2.2h7.8l1.5 2.2H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5z"
      stroke={color}
      {...stroke}
    />
    <Circle cx="12" cy="13.6" r="3.3" stroke={color} {...stroke} />
  </Svg>
);

export const ImageIcon = ({ size = 18, color = colors.brand }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="4.5" width="18" height="15" rx="2.5" stroke={color} {...stroke} />
    <Circle cx="8.5" cy="9.5" r="1.6" stroke={color} {...stroke} />
    <Path
      d="m3.6 17 4.6-4.4a2 2 0 0 1 2.7 0l3 2.9a2 2 0 0 0 2.7 0l3.4-3"
      stroke={color}
      {...stroke}
    />
  </Svg>
);

export const TrashIcon = ({ size = 16, color = colors.danger }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" stroke={color} {...stroke} />
    <Path d="M6.5 6.5 7.4 19a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.5" stroke={color} {...stroke} />
  </Svg>
);

export const CalendarIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="5.5" width="18" height="15" rx="2.5" stroke={color} {...stroke} />
    <Path d="M3 10h18M8 3.5v4M16 3.5v4" stroke={color} {...stroke} />
  </Svg>
);

export const CalculatorIcon = ({ size = 22, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="5" y="2.5" width="14" height="19" rx="2.5" stroke={color} {...stroke} />
    <Rect x="8" y="5.5" width="8" height="3.5" rx="1" stroke={color} {...stroke} />
    <Path
      d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"
      stroke={color}
      {...stroke}
      strokeWidth={2.4}
    />
  </Svg>
);

export const ShieldIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 3l7 2.6v5.6c0 4.4-2.9 8-7 9.2-4.1-1.2-7-4.8-7-9.2V5.6z" stroke={color} {...stroke} />
  </Svg>
);

export const LedgerIcon = ({ size = 22, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M6 3h9l4 4v12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"
      stroke={color}
      {...stroke}
    />
    <Path d="M15 3v4h4M8.5 11.5h7M8.5 15h7M8.5 18h4" stroke={color} {...stroke} />
  </Svg>
);

export const CheckCircleIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8.5" stroke={color} {...stroke} />
    <Path d="m8.3 12.3 2.6 2.6 4.9-5.2" stroke={color} {...stroke} />
  </Svg>
);

export const ClockIcon = ({ size = 18, color = colors.textFaint }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8.5" stroke={color} {...stroke} />
    <Path d="M12 7.5V12l3 2" stroke={color} {...stroke} />
  </Svg>
);
