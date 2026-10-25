import { palette } from '@lms/theme';

type Tone = 'light' | 'dark';

/**
 * The Finance Easy "F" tile. It carries its own navy ground; on dark (brand
 * navy) grounds a faint white ring keeps its edge from melting into the page.
 */
export function LogoMark({ size = 48, tone = 'dark' }: { size?: number; tone?: Tone }) {
  return (
    <img
      src="/mark.png"
      alt=""
      width={size}
      height={size}
      style={{
        display: 'block',
        objectFit: 'contain',
        borderRadius: size * 0.14,
        boxShadow: tone === 'light' ? '0 0 0 1px rgba(255, 255, 255, 0.35)' : undefined,
      }}
    />
  );
}

/** Mark + the Finance Easy wordmark: navy and gold on light grounds, white and gold on dark. */
export function Logo({ tone = 'dark', size = 44 }: { tone?: Tone; size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} tone={tone} />

      <span className="logo__word" style={{ fontSize: size * 0.5, color: tone === 'dark' ? palette.navy800 : palette.white }}>
        Finance <span style={{ color: palette.gold500 }}>Easy</span>
      </span>
    </span>
  );
}
