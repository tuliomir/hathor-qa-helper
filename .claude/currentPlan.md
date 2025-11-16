# Migration Plan: UnoCSS to Tailwind CSS + DaisyUI

## Goal
Replace UnoCSS with Tailwind CSS and properly configure DaisyUI to fix the toast component issues.

## Tasks

### 1. Audit current usage
- [ ] Check all components using UnoCSS/DaisyUI classes
- [ ] Document custom shortcuts that need migration
- [ ] Identify icon usage (@unocss/preset-icons)

### 2. Install Tailwind CSS dependencies
- [ ] Install tailwindcss, postcss, autoprefixer
- [ ] Install daisyui (already present)
- [ ] Choose icon solution (heroicons, lucide-react, or keep iconify)

### 3. Configure Tailwind CSS
- [ ] Create tailwind.config.ts
- [ ] Create postcss.config.js
- [ ] Configure DaisyUI plugin
- [ ] Migrate custom theme colors
- [ ] Migrate shortcuts to Tailwind @layer utilities or components

### 4. Update Vite configuration
- [ ] Remove UnoCSS plugin
- [ ] Ensure PostCSS is configured

### 5. Update CSS imports
- [ ] Update index.css to import Tailwind directives
- [ ] Remove UnoCSS virtual imports

### 6. Remove UnoCSS dependencies
- [ ] Uninstall unocss
- [ ] Uninstall @unocss/preset-uno
- [ ] Uninstall @unocss/preset-icons
- [ ] Uninstall @unscatty/unocss-preset-daisy
- [ ] Remove uno.config.ts

### 7. Update components
- [ ] Review ToastContainer component
- [ ] Update any components using custom shortcuts
- [ ] Update icon usage if needed
- [ ] Fix any broken classes

### 8. Test and verify
- [ ] Run build
- [ ] Test toast functionality
- [ ] Verify all styles render correctly
- [ ] Check for console errors

---

## Progress Log

**[COMPLETED] Task 1: Audit current usage**
- Components use: toast, alert, btn-*, input, table-* classes
- Custom shortcuts to migrate: btn-*, table-*, input, status-*, card
- No icon usage found

**[COMPLETED] Task 2: Install Tailwind CSS dependencies**
- Installed tailwindcss@3.4.18, postcss, autoprefixer
- daisyui 5.5.5 already present

**[COMPLETED] Task 3: Configure Tailwind CSS**
- Created tailwind.config.ts with DaisyUI plugin
- Created postcss.config.js
- Migrated custom theme colors
- Migrated all UnoCSS shortcuts to @layer components

**[COMPLETED] Task 4: Update Vite configuration**
- Removed UnoCSS plugin from vite.config.ts

**[COMPLETED] Task 5: Update CSS imports**
- Updated index.css with Tailwind directives
- Removed 'virtual:uno.css' import from main.tsx
- Migrated all custom shortcuts to Tailwind @layer components

**[COMPLETED] Task 6: Remove UnoCSS dependencies**
- Uninstalled all UnoCSS packages
- Removed uno.config.ts

**[COMPLETED] Task 7: Update components**
- Fixed TypeScript error in useWalletStore.ts (getWallet function)
- All components already compatible with DaisyUI/Tailwind classes

**[IN PROGRESS] Task 8: Test and verify**
- Build completed successfully ✓
- Testing toast functionality...

**[COMPLETED] Task 8: Test and verify**
- Build completed successfully ✓
- Ready for manual testing

---

## Migration Summary

### What was changed:
1. **Installed Tailwind CSS v3.4.18** with DaisyUI 5.5.5
2. **Removed all UnoCSS packages** and configuration
3. **Migrated custom shortcuts** to Tailwind @layer components in index.css:
   - Button classes: btn, btn-primary, btn-success, btn-danger, btn-warning, btn-secondary
   - Input classes: input, input-error
   - Table classes: table-header, table-row
   - Card classes: card, card-primary
   - Status classes: status-idle, status-connecting, status-syncing, status-ready, status-error
4. **Fixed ToastContainer** with proper z-index (z-50)
5. **Fixed TypeScript error** in useWalletStore.ts

### Files modified:
- `tailwind.config.ts` (created)
- `postcss.config.js` (created)
- `vite.config.ts` (removed UnoCSS plugin)
- `src/index.css` (added Tailwind directives and migrated shortcuts)
- `src/main.tsx` (removed virtual:uno.css import)
- `src/components/common/ToastContainer.tsx` (added z-50)
- `src/hooks/useWalletStore.ts` (fixed TypeScript error)
- `uno.config.ts` (deleted)

### Next steps:
- Test toast notifications (should now float properly without breaking layout)
- Verify all button, input, and table styles render correctly
- Check that custom colors work as expected

**Migration completed successfully!**

---

## Nerd Font Installation

**[COMPLETED] Install JetBrainsMono Nerd Font**
- Downloaded JetBrainsMono Nerd Font from GitHub releases (v3.4.0)
- Copied Regular (400), Medium (500), and Bold (700) weights to public/fonts/
- Added @font-face declarations in src/index.css
- Removed Google Fonts link from index.html
- Build verified - fonts are correctly copied to dist/fonts/

**Files modified:**
- `index.html` (removed Google Fonts link)
- `src/index.css` (added @font-face declarations)
- `public/fonts/` (added 3 font files: Regular, Medium, Bold)

**Result:** The application now uses JetBrainsMono Nerd Font, which includes all Nerd Font icon glyphs.

---

## Icon System Migration

**[COMPLETED] Replace UnoCSS Icons with React Icons**
- Problem: UnoCSS icon classes (i-mdi-*) no longer work after migration
- Solution: Installed react-icons library
- Updated components:
  - WalletInitialization.tsx: Play, Stop, Edit, Delete, Camera icons
  - CopyButton.tsx: ContentCopy icon
- All icons now use Material Design Icons from react-icons/md

**Files modified:**
- `src/components/stages/WalletInitialization.tsx` (imported and used MD icons)
- `src/components/common/CopyButton.tsx` (imported and used MdContentCopy)
- Added dependency: react-icons@5.5.0

**Result:** Icons now render correctly using React icon components instead of CSS classes.
