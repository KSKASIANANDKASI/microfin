import { chart, colors, palette, radius, sizing, space, type } from './index';

/**
 * Renders the tokens as CSS custom properties so the web app can style in plain
 * CSS without re-declaring any value. Injected once at boot (see web/src/main.tsx).
 */
export function tokensToCssVars(): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(palette)) lines.push(`--bb-${kebab(key)}: ${value};`);
  for (const [key, value] of Object.entries(colors)) lines.push(`--color-${kebab(key)}: ${value};`);
  for (const [key, value] of Object.entries(chart)) {
    if (typeof value === 'string') lines.push(`--chart-${kebab(key)}: ${value};`);
  }
  for (const [key, value] of Object.entries(chart.status)) lines.push(`--status-${key}: ${value};`);
  for (const [key, value] of Object.entries(space)) lines.push(`--space-${key}: ${value}px;`);
  for (const [key, value] of Object.entries(radius)) lines.push(`--radius-${key}: ${value}px;`);
  for (const [key, value] of Object.entries(sizing)) lines.push(`--size-${kebab(key)}: ${value}px;`);
  for (const [key, value] of Object.entries(type)) {
    lines.push(`--font-size-${kebab(key)}: ${value.size}px;`);
    lines.push(`--line-height-${kebab(key)}: ${value.lineHeight}px;`);
    lines.push(`--tracking-${kebab(key)}: ${value.letterSpacing}px;`);
  }

  return `:root{\n  ${lines.join('\n  ')}\n}`;
}

function kebab(value: string): string {
  return value.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
}
