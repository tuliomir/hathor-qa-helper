# Design System Documentation

This document outlines the design patterns and styling conventions used in the Hathor QA Helper application.

## Technology Stack

- **CSS Framework**: UnoCSS (atomic CSS)
- **Font**: JetBrains Mono (Nerd Font variant)
- **Icons**: Material Design Icons (via UnoCSS preset-icons)

## Color Palette

The application uses a consistent color palette defined in `uno.config.ts`:

### Primary Colors
- **Primary**: `#007bff` (Blue) - Main actions, buttons, links
- **Primary Dark**: `#0056b3` (Darker Blue) - Hover states

### Status Colors
- **Success**: `#28a745` (Green) - Success states, ready wallets
- **Danger**: `#dc3545` (Red) - Errors, destructive actions
- **Warning**: `#ffc107` (Yellow) - Warnings, in-progress states
- **Info**: `#17a2b8` (Cyan) - Informational messages

### Neutral Colors
- **Light**: `#f8f9fa` (Light Gray) - Backgrounds
- **Dark**: `#212529` (Almost Black) - Text
- **Muted**: `#6c757d` (Gray) - Secondary text
- **Border**: `#dee2e6` (Light Gray) - Borders, dividers

## Typography

### Font Family
All text uses **JetBrains Mono**, a monospace Nerd Font:
```css
font-family: 'JetBrains Mono', monospace
```

### Font Sizes
- `text-xs` - Extra small (0.75rem)
- `text-sm` - Small (0.875rem)
- `text-base` - Base (1rem)
- `text-lg` - Large (1.125rem)
- `text-xl` - Extra large (1.25rem)
- `text-2xl` - 2X large (1.5rem)
- `text-3xl` - 3X large (1.875rem)

### Font Weights
- Normal: `font-normal` (400)
- Medium: `font-medium` (500)
- Bold: `font-bold` (700)

## Spacing

UnoCSS uses a consistent spacing scale:
- `1` = 0.25rem (4px)
- `2` = 0.5rem (8px)
- `3` = 0.75rem (12px)
- `4` = 1rem (16px)
- `5` = 1.25rem (20px)
- `7.5` = 1.875rem (30px)
- `10` = 2.5rem (40px)

## Component Patterns

### Buttons

**Shortcut Classes** (defined in `uno.config.ts`):
```typescript
'btn' - Base button style
'btn-primary' - Primary action button
'btn-success' - Success button
'btn-danger' - Destructive action button
'btn-warning' - Warning button
'btn-secondary' - Secondary/muted button
```

**Usage**:
```tsx
<button className="btn-primary">
  Click Me
</button>

<button className="btn-danger text-xs">
  <span className="i-mdi-delete inline-block mr-1" />
  Delete
</button>
```

### Cards

**Shortcut Classes**:
```typescript
'card' - Base card style
'card-primary' - Card with primary border and light background
```

**Usage**:
```tsx
<div className="card-primary mb-7.5">
  <h2 className="text-xl font-bold mb-4">Card Title</h2>
  <p>Card content...</p>
</div>
```

### Form Inputs

**Shortcut Classes**:
```typescript
'input' - Base input style
'input-error' - Input with error state
```

**Usage**:
```tsx
<input
  type="text"
  className="input"
  placeholder="Enter text..."
/>

<textarea
  className={validationError ? 'input-error' : 'input'}
  rows={4}
/>
```

### Tables

**Shortcut Classes**:
```typescript
'table-header' - Table header row style
'table-row' - Table body row style
```

**Usage**:
```tsx
<table className="w-full border-collapse bg-white shadow-sm">
  <thead>
    <tr className="table-header">
      <th className="p-3 text-left font-bold">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="table-row">
      <td className="p-3">Data</td>
    </tr>
  </tbody>
</table>
```

### Status Badges

**Shortcut Classes**:
```typescript
'status-idle' - Idle state (muted gray)
'status-connecting' - Connecting state (warning yellow)
'status-syncing' - Syncing state (warning yellow)
'status-ready' - Ready state (success green)
'status-error' - Error state (danger red)
```

**Usage**:
```tsx
<span className="status-ready font-bold">
  ready
</span>
```

## Icons (Material Design Icons)

Icons are loaded via UnoCSS preset-icons. Use the `i-mdi-{icon-name}` pattern:

```tsx
<span className="i-mdi-play inline-block mr-1" />
<span className="i-mdi-stop inline-block mr-1" />
<span className="i-mdi-pencil inline-block mr-1" />
<span className="i-mdi-delete inline-block mr-1" />
<span className="i-mdi-camera inline-block" />
```

**Common Icons**:
- `i-mdi-play` - Play/Start action
- `i-mdi-stop` - Stop action
- `i-mdi-pencil` - Edit/Rename
- `i-mdi-delete` - Delete/Remove
- `i-mdi-camera` - Camera
- `i-mdi-check` - Checkmark
- `i-mdi-close` - Close/Cancel

## Layout Patterns

### Flex Container
```tsx
<div className="flex items-center gap-2.5">
  {/* Horizontal layout with centered items */}
</div>

<div className="flex flex-col gap-4">
  {/* Vertical layout with gap */}
</div>
```

### Grid Layout
```tsx
<div className="grid grid-cols-3 gap-4">
  {/* 3-column grid */}
</div>
```

### Centering
```tsx
<div className="max-w-300 mx-auto">
  {/* Centered container with max width */}
</div>
```

## Responsive Design

UnoCSS provides responsive breakpoints:
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up

**Usage**:
```tsx
<div className="p-4 md:p-8 lg:p-12">
  {/* Responsive padding */}
</div>
```

## Best Practices

### 1. **Use Shortcut Classes**
Prefer predefined shortcuts for common patterns:
```tsx
✅ <button className="btn-primary">Click</button>
❌ <button className="px-3 py-2 rounded cursor-pointer bg-primary text-white hover:bg-primary-dark">Click</button>
```

### 2. **Consistent Spacing**
Use the spacing scale consistently:
```tsx
✅ <div className="mb-4">
❌ <div style={{ marginBottom: '15px' }}>
```

### 3. **Semantic Color Usage**
Use color classes semantically:
```tsx
✅ <span className="text-success">Ready</span>
❌ <span className="text-green-600">Ready</span>
```

### 4. **Combine Utilities**
Combine utility classes for complex styles:
```tsx
<div className="p-4 bg-cyan-50 border border-info rounded mb-4">
  {/* Info box */}
</div>
```

### 5. **Icon Sizing**
Always include `inline-block` with icons:
```tsx
✅ <span className="i-mdi-play inline-block mr-1" />
❌ <span className="i-mdi-play mr-1" />
```

## Custom Utilities

If you need custom utilities not provided by UnoCSS, add them to `uno.config.ts`:

```typescript
shortcuts: {
  'my-custom-class': 'px-4 py-2 bg-blue-500 text-white rounded',
}
```

## Migration from Inline Styles

When migrating components from inline styles to UnoCSS:

1. **Identify repeated patterns** → Create shortcuts
2. **Convert colors** → Use theme colors
3. **Convert spacing** → Use spacing scale
4. **Replace inline styles** → Use className
5. **Test responsiveness** → Add responsive classes

**Example Migration**:
```tsx
// Before
<button style={{
  padding: '6px 12px',
  fontSize: '13px',
  backgroundColor: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}}>
  Click
</button>

// After
<button className="btn-primary text-xs">
  Click
</button>
```

## Performance Considerations

UnoCSS is extremely fast and generates only the CSS you actually use:

- ✅ Only used utilities are included in the final CSS
- ✅ No unused CSS bloat
- ✅ Atomic CSS = small bundle size
- ✅ Fast build times

## Development Workflow

1. **Write JSX** with className
2. **UnoCSS scans** your files
3. **Generates CSS** for used classes only
4. **Hot reloads** instantly during development

No CSS files to maintain - everything is in your components!