# DaisyUI Components Reference

**Docs**: https://daisyui.com/components/

## Available Components

### Actions
- **Button**: `btn`, `btn-primary`, `btn-secondary`, `btn-accent`, `btn-ghost`, `btn-link`
- **Dropdown**: `dropdown`, `dropdown-content`
- **Modal**: `modal`, `modal-box`, `modal-action`
- **Swap**: `swap`, `swap-rotate`, `swap-flip`

### Data Display
- **Alert**: `alert`, `alert-info`, `alert-success`, `alert-warning`, `alert-error`
- **Badge**: `badge`, `badge-primary`, `badge-secondary`
- **Card**: `card`, `card-body`, `card-title`, `card-actions`
- **Table**: `table`, `table-zebra`, `table-pin-rows`
- **Toast**: `toast`, `toast-top`, `toast-bottom`, `toast-start`, `toast-end`, `toast-center`

### Data Input
- **Checkbox**: `checkbox`, `checkbox-primary`
- **Input**: `input`, `input-bordered`, `input-primary`
- **Radio**: `radio`, `radio-primary`
- **Select**: `select`, `select-bordered`
- **Textarea**: `textarea`, `textarea-bordered`
- **Toggle**: `toggle`, `toggle-primary`

### Layout
- **Divider**: `divider`
- **Drawer**: `drawer`, `drawer-side`, `drawer-content`
- **Footer**: `footer`
- **Hero**: `hero`, `hero-content`
- **Stack**: `stack`

### Navigation
- **Breadcrumbs**: `breadcrumbs`
- **Menu**: `menu`, `menu-title`
- **Navbar**: `navbar`, `navbar-start`, `navbar-center`, `navbar-end`
- **Tabs**: `tabs`, `tab`, `tab-active`

### Feedback
- **Loading**: `loading`, `loading-spinner`, `loading-dots`
- **Progress**: `progress`, `progress-primary`
- **Skeleton**: `skeleton`
- **Tooltip**: `tooltip`, `tooltip-top`, `tooltip-bottom`

## Usage Pattern

```tsx
// Alert in Toast (current implementation)
<div className="toast toast-bottom toast-start">
  <div className="alert alert-success">
    <span>Message</span>
  </div>
</div>

// Button
<button className="btn btn-primary">Click</button>

// Card
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <p>Content</p>
  </div>
</div>
```

## Notes
- All components work with UnoCSS via `@unscatty/unocss-preset-daisy`
- Use DaisyUI docs for detailed API and examples
- Combine with Tailwind utilities (via UnoCSS preset-uno)