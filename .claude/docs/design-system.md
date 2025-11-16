# Design System

UnoCSS (atomic CSS) + JetBrains Mono + Material Design Icons

## Shortcuts (uno.config.ts)

**Buttons**: `btn`, `btn-primary`, `btn-success`, `btn-danger`, `btn-warning`, `btn-secondary`
**Cards**: `card`, `card-primary`
**Inputs**: `input`, `input-error`
**Tables**: `table-header`, `table-row`
**Status**: `status-idle`, `status-connecting`, `status-syncing`, `status-ready`, `status-error`

## Colors
- Primary: `#007bff`, Hover: `#0056b3`
- Success: `#28a745`, Danger: `#dc3545`, Warning: `#ffc107`, Info: `#17a2b8`
- Light: `#f8f9fa`, Dark: `#212529`, Muted: `#6c757d`, Border: `#dee2e6`

## Common Patterns
```tsx
// Button with icon
<button className="btn-primary text-xs">
  <span className="i-mdi-delete inline-block mr-1" />
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
Use `i-mdi-{name}` pattern: `i-mdi-play`, `i-mdi-stop`, `i-mdi-pencil`, `i-mdi-delete`, `i-mdi-camera`, `i-mdi-check`, `i-mdi-close`

Always add `inline-block`: `<span className="i-mdi-play inline-block mr-1" />`

## Spacing Scale
`1`=4px, `2`=8px, `3`=12px, `4`=16px, `5`=20px, `7.5`=30px, `10`=40px

## Responsive
`sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)

## Best Practices
✅ Use shortcuts: `btn-primary` not `px-3 py-2 rounded...`
✅ Semantic colors: `text-success` not `text-green-600`
✅ Spacing scale: `mb-4` not `style={{marginBottom: '15px'}}`