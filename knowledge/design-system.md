# Design System

Tailwind CSS v3 + DaisyUI 5 + Atkinson Hyperlegible Next / JetBrains Mono + React Icons

The redesign spec lives in `docs/design/` (tokens in `docs/design/tokens.md`). This page is rewritten when the rollout reaches T11.

## Component Classes (src/index.css)

**Buttons**: `btn`, `btn-primary`, `btn-success`, `btn-danger`, `btn-warning`, `btn-secondary`
**Cards**: `card`, `card-primary`
**Inputs**: `input`, `input-error`
**Tables**: `table-header`, `table-row`
**Status**: `status-idle`, `status-connecting`, `status-syncing`, `status-ready`, `status-error`

These are custom classes defined in `src/index.css` using `@layer components`.

## Colors (theme `bench` in src/index.css)

Colours are daisyUI 5 theme variables set by `[data-theme='bench']` on `<html>` (dark: `bench-dark`), plus app variables prefixed `--qa-`. Use the semantic utilities:

- daisyUI: `bg-base-100` (panel), `bg-base-200` (page), `border-base-300`, `text-base-content`, `primary`, `secondary`, `accent` (shielded only), `info`, `success`, `warning`, `error`
- App (tailwind.config.ts): `text-ink-muted`, `border-field-border`, `text-warning-ink` (warning text on white; `text-warning` is too light for text), `net-testnet|shielded|mainnet`, `bg-tint-success|warning|error|info|shielded|testnet`, `shadow-float`, `bg-veil`
- No `/<alpha>` modifiers on theme colours (Tailwind 3 cannot apply them to CSS variables); use the `tint-*` colours
- Legacy aliases kept until the stage sweep: `danger`, `muted`, `light`, `dark`, `border`, `primary-dark`

## Common Patterns

```tsx
import { MdDelete, MdCamera } from 'react-icons/md';

// Button with icon
<button className="btn-primary text-xs flex items-center gap-1">
  <MdDelete />
  Delete
</button>

// Card
<div className="card-primary mb-7.5">
  <h2 className="text-xl font-bold mb-4">Title</h2>
</div>

// Input
<input className={error ? 'input-error' : 'input'} />

// Layout
<div className="flex items-center gap-2.5">...</div>
<div className="grid grid-cols-3 gap-4">...</div>
```

## Icons

Use **react-icons** library (Material Design Icons):

- Import from `react-icons/md`: `import { MdPlay, MdStop, MdEdit } from 'react-icons/md';`
- Common icons: `MdPlayArrow`, `MdStop`, `MdEdit`, `MdDelete`, `MdCamera`, `MdCheck`, `MdClose`, `MdContentCopy`
- Use as React components: `<MdPlay />`
- Browse all icons: https://react-icons.github.io/react-icons/icons/md/

## Font

- Interface text: Atkinson Hyperlegible Next (`font-sans`, the default), from the `@fontsource/atkinson-hyperlegible-next` package imported in `src/main.tsx`. Weights 400, 500, 600, 700.
- Data (hashes, addresses, amounts, JSON): JetBrains Mono Nerd Font (`font-mono`), self-hosted in `public/fonts/`, with slashed zero and tabular figures.
- Type scale: `text-caption`, `text-body`, `text-body-lg`, `text-title-sm`, `text-title`, `text-page`, `text-data`, `text-data-sm`

## Spacing Scale

Tailwind spacing: `1`=4px, `2`=8px, `3`=12px, `4`=16px, `5`=20px, `7.5`=30px, `10`=40px

## Responsive

Tailwind breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

## Best Practices

✅ Use custom component classes: `btn-primary` not `px-3 py-2 rounded...`
✅ Use semantic colors: `text-success` not `text-green-600`
✅ Use Tailwind spacing: `mb-4` not `style={{marginBottom: '15px'}}`
✅ Import icons from react-icons: `import { MdIcon } from 'react-icons/md'`
✅ Use DaisyUI components when available (toast, alert, etc.)
