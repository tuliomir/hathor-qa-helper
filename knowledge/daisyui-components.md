# daisyUI in QA Helper

**Docs**: https://daisyui.com/components/ (version 5).

daisyUI is pinned to **5.5.20**: 5.7.x emits CSS that Tailwind 3 rejects. Don't bump it. It is loaded as a plugin in `apps/client/tailwind.config.ts`; the themes are defined in `src/index.css` as `[data-theme='bench']` and `[data-theme='bench-dark']` (see `docs/design/tokens.md`), so every daisyUI class picks up the bench palette.

Prefer the app components (`knowledge/design-system.md`) over raw daisyUI markup: `Panel` instead of `card`, `Callout` instead of `alert`, `DataTable` instead of `table`, `Modal` / `ConfirmDialog` instead of hand-built `modal` markup. Use daisyUI classes directly for the leaf controls below.

## What we use

| Kind | Classes | Notes |
|---|---|---|
| Buttons | `btn` + `btn-primary` (one per view, the main action), `btn-secondary`, `btn-ghost` (tertiary, icon buttons), `btn-error` / `btn-outline` (destructive); sizes `btn-sm`, `btn-xs`; `btn-square` for icon-only | Always with the `btn` base class. Icon-only buttons need `aria-label` |
| Text inputs | `input` (also as a `<label>` wrapper with an icon and a bare `<input>` inside), `input-error` | Add `w-full`: daisyUI's default is 20rem. The field border colour comes from `src/index.css` |
| Other controls | `select`, `textarea`, `checkbox checkbox-sm`, `toggle toggle-sm`, `join` (segmented groups) | Wrap in `Field` for label, hint and error |
| Feedback | `loading loading-spinner loading-xs|sm` (inside buttons while running), `skeleton` (loading rows), `progress progress-primary` | No full-screen loading overlays |
| Overlays | `modal modal-open` + `modal-box` + `modal-backdrop` | Via `ui/Modal` or `ui/ConfirmDialog` |
| Menus | `menu`, `dropdown`, `dropdown-content` | Popovers use `ui/usePopover` |
| Misc | `kbd kbd-sm` (shortcuts), `link link-primary`, `collapse`, `steps`, `toast` (ToastContainer only) | |

Not used: `card` / `alert` / `badge` colour variants in stages (use `Panel`, `Callout`, `StatusChip`), `table-zebra`, opacity-modifier colours.

## Patterns

```tsx
// Primary action with a running state
<button type="button" className="btn btn-primary" disabled={running}>
  {running && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
  Send transaction
</button>

// Input with a leading icon
<label className="input w-full">
  <MdSearch className="h-4 w-4 text-ink-muted" aria-hidden="true" />
  <input type="search" aria-label="Search wallets" className="min-w-0 grow" />
</label>

// Icon-only button
<button type="button" className="btn btn-ghost btn-sm btn-square" aria-label="Close">
  <MdClose aria-hidden="true" />
</button>
```

## Gotchas

- Tailwind's preflight is wrapped in the `qa-base` cascade layer at the top of `src/index.css`. Without it, Tailwind 3's unlayered preflight beats daisyUI 5's layered component styles (button backgrounds, borders).
- `btn-primary` without `btn` renders as plain text. The legacy shortcut that made it work was removed in T10.
- daisyUI colour classes follow the theme, so `text-warning` on white is too light for text: use `text-warning-ink`.
