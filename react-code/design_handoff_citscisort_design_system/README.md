# Handoff: CitSci Sort Design System Integration

## Overview

This handoff captures a **documentation-only design system** for the CitSci Sort web app (Ibercivis Foundation) — a community-driven tool for classifying citizen-science literature. The system was derived by reading the existing codebase, not by inventing a new visual language.

The target codebase is the repo this was extracted from: a **React 19 + MUI 7 + Vite** app.

## About the Design Files

The files in `system/` are **design references, not production code**.

- `system/README.md` is the full written spec (content fundamentals, visual foundations, component patterns, iconography, caveats).
- `system/SKILL.md` is a short agent-facing quick reference with the ten non-negotiable rules.
- `system/colors_and_type.css` is a CSS-custom-properties mirror of the MUI theme tokens. **Do not import this into the React app** — the app already has these values via the MUI theme. This file is for preview/demo pages, external tools (emails, PDF exports, posters), and docs.
- `system/preview/*.html` are standalone token + component reference cards.
- `system/ui_kits/web/index.html` is a click-thru HTML prototype of five product surfaces (Dashboard, Classify, Debates, Stats, Login). It shows layout intent, not implementation.
- `system/assets/` contains a proposed logo mark + wordmark.

Your task is **not to port these HTML files into the app**. Your task is to make a handful of concrete changes inside the existing React codebase so the design system becomes real — most of it is already implemented via MUI defaults, so the diff is small.

## Fidelity

**High-fidelity.** All colors, typography, spacing, and component patterns are pixel-accurate to what the live app already renders (since most tokens are MUI defaults the app is using as-is). Exact hex values, token names, and component props are specified.

---

## The Work

There are **four concrete tasks**. Do them in order. Nothing else in the codebase should change.

### Task 1 — Extract the MUI theme into its own module

**Why:** Right now `createTheme({ palette: { primary: { main: '#1976d2' }, secondary: { main: '#dc004e' } } })` is inlined in `src/App.jsx`. That makes the theme invisible to anyone reading the project and impossible to extend without editing `App.jsx`.

**Do this:**

1. Create `src/theme/index.js`:
   ```js
   import { createTheme } from '@mui/material/styles';

   // CitSci Sort theme. Mirrors the design system documented in
   // design_handoff_citscisort_design_system/system/README.md.
   // Most values are MUI defaults kept explicit for discoverability.
   export const theme = createTheme({
     palette: {
       mode: 'light',
       primary:   { main: '#1976d2', light: '#42a5f5', dark: '#1565c0', contrastText: '#ffffff' },
       secondary: { main: '#dc004e', light: '#ff5c8d', dark: '#9a0036', contrastText: '#ffffff' },
       success:   { main: '#2e7d32' },
       warning:   { main: '#ed6c02' },
       error:     { main: '#d32f2f' },
       info:      { main: '#0288d1' },
       background:{ default: '#ffffff', paper: '#ffffff' },
       text:      { primary: 'rgba(0,0,0,0.87)', secondary: 'rgba(0,0,0,0.60)', disabled: 'rgba(0,0,0,0.38)' },
       divider:   'rgba(0,0,0,0.12)',
     },
     shape: { borderRadius: 4 },
     typography: {
       fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
       // MUI defaults kept — no overrides.
     },
   });
   ```

2. In `src/App.jsx`, replace the inline `createTheme(...)` with:
   ```js
   import { theme } from './theme';
   ```
   and pass `theme` to `<ThemeProvider theme={theme}>`.

3. Remove the now-unused `createTheme` import from `App.jsx`.

**Acceptance:** app still compiles and renders identically. `App.jsx` no longer mentions colors.

---

### Task 2 — Replace the Vite placeholder logo

**Why:** the app currently ships Vite's default purple lightning-bolt SVG as its favicon and has no real brandmark. The sidebar header reads "CitSci Sort" as plain text with no icon.

**Do this:**

1. Copy `system/assets/logo-mark.svg` into `public/logo-mark.svg`, and `system/assets/favicon.svg` into `public/favicon.svg`. Delete `public/vite.svg` if it exists at the root of `public/`.

2. In `index.html` update the favicon link:
   ```html
   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
   ```

3. In `src/components/dashboard/SideMenu.jsx` (and the mobile drawer variant if one exists), prepend the mark to the existing `"CitSci Sort"` Typography:
   ```jsx
   import { Box, Typography } from '@mui/material';

   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 2 }}>
     <Box component="img" src="/logo-mark.svg" alt="" sx={{ width: 32, height: 32, display: 'block' }} />
     <Typography variant="h6" color="primary" sx={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
       CitSci Sort
     </Typography>
   </Box>
   ```
   The `alt=""` is intentional — the wordmark next to it already provides the accessible name.

4. If the login page has a large logo slot, use `system/assets/logo.svg` (mark + wordmark locked up) there at ~160px wide.

**Acceptance:** favicon, sidebar header, and login hero all show the new mark. No Vite branding remains.

> ⚠️ **Note for the product owner, not the implementer:** the mark in `system/assets/` is a **proposed** mark introduced by the design system, not an officially approved brand asset. It visualizes the core sort (a paper forking into a filled "Science" bin and an outlined "Meta-science" bin). If the Ibercivis Foundation has a real mark, use that instead — this placeholder is better than Vite's default but should be reviewed.

---

### Task 3 — Extract the repeated select-card into a reusable component

**Why:** `src/components/ClassificationForm.jsx` (and adjacent files) implement the select-card pattern inline — a Card with a selected state, a checkmark badge, title, and description. Same markup appears in at least two places with slightly different props. The design system treats this as a first-class primitive (see `system/preview/select-card.html`).

**Do this:**

1. Create `src/components/SelectCard.jsx`:
   ```jsx
   import { Card, CardActionArea, Box, Typography } from '@mui/material';
   import CheckCircleIcon from '@mui/icons-material/CheckCircle';

   /**
    * SelectCard — the canonical "pick one (or many)" card for CitSci Sort.
    * See design_handoff_citscisort_design_system/system/preview/select-card.html
    *
    * Props:
    *   selected   boolean  — whether this card is currently selected
    *   onClick    function — click handler (parent owns state)
    *   icon       node     — optional leading icon
    *   title      string   — short label, Sentence case
    *   description string  — one-line description, optional
    *   multi      boolean  — informational only; styling is identical for single/multi
    */
   export default function SelectCard({ selected, onClick, icon, title, description }) {
     return (
       <Card
         variant="outlined"
         sx={{
           position: 'relative',
           borderWidth: selected ? 2 : 1,
           borderColor: selected ? 'primary.main' : 'divider',
           bgcolor: selected ? 'rgba(25,118,210,0.08)' : 'background.paper',
           transition: 'border-color 150ms ease, background-color 150ms ease',
           '&:hover': { borderColor: selected ? 'primary.main' : 'primary.light' },
         }}
       >
         <CardActionArea onClick={onClick} sx={{ p: 2, alignItems: 'flex-start' }}>
           {selected && (
             <CheckCircleIcon
               sx={{ position: 'absolute', top: 8, right: 8, color: 'primary.main', fontSize: 20 }}
             />
           )}
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: description ? 0.5 : 0 }}>
             {icon}
             <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>{title}</Typography>
           </Box>
           {description && (
             <Typography variant="body2" color="text.secondary">{description}</Typography>
           )}
         </CardActionArea>
       </Card>
     );
   }
   ```

2. Refactor the inline usages in `ClassificationForm.jsx` (and any sibling step components) to use `<SelectCard />`. Parent components keep owning the selection state — `SelectCard` is purely presentational.

3. Do not remove or rename the existing selection state logic. Do not change the Classify flow's behavior.

**Acceptance:** the Classify screen looks identical to before. `git diff` shows JSX shortened in `ClassificationForm.jsx` and a new `SelectCard.jsx` file. No prop names for parent state have changed.

---

### Task 4 — Add the design system to the repo root

**Why:** future contributors (human and AI) should discover the system without leaving the repo.

**Do this:**

1. Move the entire `design_handoff_citscisort_design_system/system/` folder (everything except this `README.md`) into `docs/design-system/` at the repo root.

2. Add a short pointer to the top-level `README.md` under a new **Design** section:
   ```md
   ## Design

   The product's design system lives in [`docs/design-system/`](./docs/design-system/).
   Start with [`README.md`](./docs/design-system/README.md) for the full spec,
   or [`ui_kits/web/index.html`](./docs/design-system/ui_kits/web/index.html)
   for an interactive click-thru of the main screens.
   ```

3. Leave `docs/design-system/SKILL.md` in place — agents working on the repo will read it automatically when given the folder as context.

**Acceptance:** `docs/design-system/` exists, the root README links to it, and `ui_kits/web/index.html` loads cleanly when opened from disk.

---

## Out of scope (do not do)

- **Do not convert the HTML preview files or UI kit into React components.** They are documentation. The React app already implements these patterns via MUI.
- **Do not change colors, typography, or spacing** anywhere in the app. They already match the system.
- **Do not introduce dark mode.** The system intentionally does not specify one.
- **Do not add new dependencies.** Everything above uses packages already in `package.json`.
- **Do not refactor `ClassificationForm.jsx`'s state management** — only swap inline markup for `<SelectCard />`.

## Design Tokens Reference

These are already implemented in the MUI theme; listed here so you can verify:

### Color
| Token | Value |
|---|---|
| `primary.main` | `#1976d2` |
| `primary.light` | `#42a5f5` |
| `primary.dark` | `#1565c0` |
| `secondary.main` | `#dc004e` |
| `success.main` | `#2e7d32` |
| `warning.main` | `#ed6c02` |
| `error.main` | `#d32f2f` |
| `info.main` | `#0288d1` |
| `text.primary` | `rgba(0,0,0,0.87)` |
| `text.secondary` | `rgba(0,0,0,0.60)` |
| `divider` | `rgba(0,0,0,0.12)` |
| `background.default/paper` | `#ffffff` |

### Selected-state overlay
`rgba(25,118,210,0.08)` — the primary at 8% alpha. Used on selected `SelectCard` background.

### Typography
Roboto, MUI default scale. The signature treatment is the **overline**: `12px / 400 / +1px letter-spacing / UPPERCASE`, used for section labels (AUTHORS, ABSTRACT, KEYWORDS).

### Spacing
MUI 8-point scale. Default page padding: `p: 3` (24px). Card internal padding: `p: 2` (16px).

### Radii & Shadows
`shape.borderRadius = 4`. Shadows: MUI defaults. Cards are `elevation=0 + 1px divider` by default; stats cards use `elevation=2`; classify main panel uses `elevation=3`.

### Icons
Material Icons via `@mui/icons-material`, filled, 24dp default. Do not mix in other icon sets.

---

## Assets

All assets in `system/assets/` are either MUI defaults (already in the app) or new proposals introduced by the system:

| File | Origin | Status |
|---|---|---|
| `logo-mark.svg` | **New**, designed for this system | Proposal — replace if Ibercivis supplies an official mark |
| `logo.svg` | **New** — mark + "CitSci Sort" wordmark lockup | Proposal |
| `favicon.svg` | **New**, simplified mark optimized for 16/32px | Proposal |

---

## Files in this handoff

- `README.md` — this document
- `system/README.md` — the full design system spec
- `system/SKILL.md` — agent-facing quick reference
- `system/colors_and_type.css` — tokens as CSS custom properties (for docs/external use)
- `system/preview/*.html` — 20 token + component reference cards
- `system/ui_kits/web/index.html` — interactive click-thru of Dashboard / Classify / Debates / Stats / Login
- `system/assets/` — proposed logo mark, wordmark, favicon

---

## Caveats from the source-of-truth spec

Reproduced here so the implementer doesn't miss them:

1. **The design system was reverse-engineered.** There is no authored theme spec in the original codebase; values were inferred by reading `src/pages/*` and `src/components/*` MUI usage.
2. **No real brand logo exists.** The proposed mark is a design-system proposal only.
3. **Dark mode is not specified.** MUI's hooks exist in code but no dark surfaces are exposed to users today.
4. **No mobile-app, marketing-site, or deck theme.** The product is web-only.
