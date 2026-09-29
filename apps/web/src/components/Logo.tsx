import { palette, radius } from '@lms/theme';

type Tone = 'light' | 'dark';

/**
 * The BillionBrains "B" mark, lifted from the corporate logo. On dark grounds
 * it sits on the cream tile it was drawn against, so the navy stays legible.
 */
export function LogoMark({ size = 48, tone = 'dark' }: { size?: number; tone?: Tone }) {
  const img = (
    <img
      src="/mark.png"
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );

  if (tone === 'dark') return img;

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: size * 0.14,
        background: palette.paper,
        borderRadius: radius.lg,
      }}
    >
      {img}
    </span>
  );
}

/** Mark + wordmark lockup. */
export function Logo({ tone = 'dark', size = 44 }: { tone?: Tone; size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} tone={tone} />

      {tone === 'dark' ? (
        <img
          src="/wordmark.png"
          alt="BillionBrains Tech Ltd"
          style={{ display: 'block', height: size * 0.72, width: 'auto' }}
        />
      ) : (
        <span>
          <span className="logo__word" style={{ fontSize: size * 0.46, color: palette.white }}>
            BILLION<span style={{ color: palette.gold500 }}>BRAINS</span>
          </span>
          <span
            className="logo__tag"
            style={{
              fontSize: size * 0.2,
              color: palette.navy200,
              borderTop: `1px solid ${palette.navy400}`,
              paddingTop: 4,
            }}
          >
            TECH LTD
          </span>
        </span>
      )}
    </span>
  );
}
