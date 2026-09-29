# @lms/theme — BillionBrains design system

Single source of truth for colour, type, spacing, radii and elevation. Plain
data with no platform imports, so both apps consume the same values:

- **Web** (`apps/web`) — `tokensToCssVars()` is injected into `<head>` at boot
  and every rule in `src/styles/global.css` reads a `var(--…)`. No hex literals
  in CSS.
- **Mobile** (`apps/mobile`) — `src/theme/index.ts` re-exports the tokens and
  adds RN-only helpers (`textStyle`, `elevation`, `fontFamily`).

## Brand

Sampled from the corporate logo (`apps/*/assets|public/mark.png`):

| Role      | Token             | Value     |
| --------- | ----------------- | --------- |
| Navy      | `palette.navy800` | `#062045` |
| Gold      | `palette.gold500` | `#C29A46` |
| Cream     | `palette.paper`   | `#FDFDFB` |
| App bg    | `colors.bg`       | `#F7F8FB` |
| Field fill| `colors.bgField`  | `#EEF1F6` |

Type: **Poppins** (700/800) for the wordmark and headings, **Inter** for UI and
body. Web loads them from Google Fonts; mobile from `@expo-google-fonts/*`.

Controls are 52px tall and `radius.md` (12px) on both platforms, so a screen
looks like the same product whichever device it renders on.

## Adding a token

Add it to `src/index.ts` only. The web picks it up as a CSS variable
automatically (`--color-*`, `--space-*`, `--font-size-*`, …); mobile reads it
straight off the export. Never introduce a literal in an app.
