# Design System

Tailwind CSS v3 + DaisyUI + JetBrains Mono Nerd Font + React Icons

## Component Classes (src/index.css)

**Buttons**: `btn`, `btn-primary`, `btn-success`, `btn-danger`, `btn-warning`, `btn-secondary`
**Cards**: `card`, `card-primary`
**Inputs**: `input`, `input-error`
**Tables**: `table-header`, `table-row`
**Status**: `status-idle`, `status-connecting`, `status-syncing`, `status-ready`, `status-error`

These are custom classes defined in `src/index.css` using `@layer components`.

## Colors (tailwind.config.ts)
- Primary: `#007bff`, Hover: `#0056b3`
- Success: `#28a745`, Danger: `#dc3545`, Warning: `#ffc107`, Info: `#17a2b8`
- Light: `#f8f9fa`, Dark: `#212529`, Muted: `#6c757d`, Border: `#dee2e6`

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
JetBrains Mono Nerd Font (self-hosted in `public/fonts/`)
- Includes Nerd Font icon glyphs
- Weights: Regular (400), Medium (500), Bold (700)

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