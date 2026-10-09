# CitSci Sort — Design System

A design system built from the **CitSci Sort** React application — a collaborative platform for classifying and mapping the scientific literature on Citizen Science (CS).

> CitSci Sort is a community-driven classification tool developed by the **Ibercivis Foundation** in the context of the **RIECS Concept** initiative (*Towards a Pan-European Research Infrastructure for Excellent Citizen Science*). Contributors read scientific abstracts and assign them to a three-step classification scheme, producing a research dataset on how citizen science is studied across disciplines.

## Product at a glance

CitSci Sort is a single React web app with the following surfaces:

| Route | Purpose |
| --- | --- |
| `/login`, `/register` | Email + Google OAuth sign-in, two-column marketing layout |
| `/dashboard` | Personal landing — welcome tile, KPIs, quick links |
| `/classify` | The core workflow — abstract on the left, 4-step classification form on the right |
| `/debates` | Community-initiated threaded debates on individual abstracts |
| `/stats`, `/my-stats` | Project-wide + personal dashboards (recharts treemap, donut, bars) |
| `/activity` | Activity feed of recent classifications |
| `/saved-abstracts`, `/followed-debates` | Personal bookmarks |
| `/about` | About / Terms / Privacy tabs — long-form scholarly content |
| `/account` | Profile & settings |

Only one product (the web app) is represented. There is no separate marketing site, mobile app, docs portal, or brand deck — this design system covers the web-app surface only.

## Sources

- **Codebase:** attached as the `citscisort/` mount (Vite + React 19 + MUI 7 + `react-router-dom` 7 + `recharts` + `@react-oauth/google`).
- **Internal reference files explored:**
  `src/App.jsx`, `src/pages/{Login,Dashboard,Classify,Debates,Stats,About}.jsx`,
  `src/components/dashboard/{SideMenu,DashboardNavbar,MainGrid}.jsx`,
  `src/components/{ClassificationForm,KeywordCloud}.jsx`,
  `src/constants/categoryIcons.jsx`,
  `src/index.css`.
- **No Figma, slide deck, logo, or brand assets** were provided — the repo's `public/vite.svg` is the default Vite starter logo, not a CitSci brand mark. See the CAVEATS section below.

---

## Content Fundamentals

Copy in CitSci Sort is written in the voice of a **scholarly research platform** run by a European non-profit. The tone is sober, explanatory, and respectful of the reader's intelligence. It is **not** casual, not marketing-y, and never playful.

**Voice & tone**
- **Instructive, not promotional.** "Select the category that best describes this abstract." Not "Pick one!".
- **Community-oriented.** First-person plural is used for the platform operators ("We retain your account data…"), second-person for the reader ("Your contributions will support…"). First-person singular is never used.
- **Explains itself.** Every classification step is introduced with a plain-language summary *plus* academic references with DOI links. The about page alone cites ~12 peer-reviewed works.

**Casing**
- Sentence case for body copy and headings. Title Case only for proper nouns and navigation labels (Dashboard, Classify, Debates, Activity Feed, Statistics).
- Buttons in MUI's default UPPERCASE (e.g. `SIGN IN`, `SUBMIT`, `START CLASSIFYING`) — this is an inherited MUI behavior, not a brand choice, but it is consistent.
- Overline labels are UPPERCASE tracked (+1px) — e.g. "AUTHORS", "ABSTRACT", "KEYWORDS" on the Classify page.

**Vocabulary — domain-specific, used literally**
- Prefer precise academic terms over friendly substitutes: *abstract*, *classification*, *meta-research*, *infrastructure*, *corpus*, *taxonomy*, *canon*, *pillar*, *dichotomy*, *disambiguation*.
- The three main categories are the immutable **"Scientific Findings / Meta-research / Not Sure"** — not "research paper / about-research paper / idk".
- Seven meta-research aspects: Methodology & Design, Data Quality & Validation, Impact & Outcomes, Participation & Engagement, Ethics & Legal, Theory & Framework, Technology & Platforms.

**Phrasing patterns**
- *"Select all aspects that apply — multiple selections are expected"*  (instruction + reassurance)
- *"You're all caught up!"* (empty notification state — one of the few warm touches)
- *"Have something to debate about this paper with the community?"* (post-submit upsell)
- *"Press Enter to add a platform not in the list"* (gentle inline help)
- *"if applicable"* (used as step label for conditionally-skipped form steps)

**Emoji & decoration**
- **No emoji anywhere in product UI.** The repo README uses two emoji (🔐 🎨 📱 ⚡) for developer-facing bullet points, but these are never surfaced in the product.
- **Unicode check `✓`** is used once, inside the selected-item badge on the ClassificationForm cards. That is the only decorative glyph.
- No hand-drawn illustrations, no stickers, no mascots.

**"Cobete mode"** — a quirky detail worth preserving: the Classify page has a secret toggle (rocket icon) that hides descriptions, metadata, and step labels for experienced classifiers. Called *kamikazeMode* internally, *Cobete* ("little rocket" in Spanish) in the UI. Ibercivis Foundation is Spanish — this is the only Spanish-language surface in an otherwise English app.

---

## Visual Foundations

The visual language is **classic Material Design 3 / MUI 7 light theme, unmodified.** The team did not author a custom palette, typography scale, or shadow ramp — they took MUI's defaults and used them cleanly and consistently. This design system documents what's there, not what we wish was there.

### Color

- **Primary** is MUI blue 700 (`#1976d2`) — used for nav active state, primary buttons, chips, links, category-selected borders, and the welcome-tile gradient on the dashboard.
- **Secondary** is MUI crimson (`#dc004e`) — used sparingly, mainly for: (a) the "RRI second canon" block on the About page, (b) training-mode chips, (c) the step-2→step-3 connector in the classification framework explainer. It is **not** the main accent.
- **Semantic colors** are stock MUI: success green `#2e7d32`, warning orange `#ed6c02`, info `#0288d1`, error `#d32f2f`. Appear in alerts, badges, progress bars.
- **Greys** are MUI's 50→900 ramp. Surfaces are pure white; `grey.50` is the universal "summary / review / muted block" background; `grey.100` is table-header and header-bar background.
- **Alpha overlays** (important): selected classification cards use `rgba(25,118,210,0.08)` for fill and `rgba(25,118,210,0.13)` on hover. Not a solid tint — always alpha.
- **Imagery color vibe** — there is no photography, illustration, or texture. The only imagery is the Recharts treemap on the stats page, which uses a 6-step blue scale from `#42a5f5` → `#0d47a1`.

### Typography

- **Roboto** (300 / 400 / 500 / 700), loaded from Google Fonts, with fallbacks `'Helvetica', 'Arial', sans-serif`.
- MUI's stock type scale is used as-is: `h1`…`h6`, `subtitle1/2`, `body1/2`, `button`, `caption`, `overline`. See `colors_and_type.css`.
- **Weight vocabulary**
  - 300 for `h1`, `h2` — only appears on the About page hero.
  - 400 default body.
  - 500 for subtitles, button text, "medium" emphasis.
  - 700 for section titles (`fontWeight="bold"` throughout) — the workhorse emphasis weight.
- **Overline** (12px, 2.66 leading, uppercase, +1px tracking) is used heavily as the "this is a label for a field" treatment: `AUTHORS`, `ABSTRACT`, `KEYWORDS`, `YOUR STATS`.
- No serif, no display font, no hand-set type treatments.

### Spacing

- MUI's 8px base grid. `theme.spacing(3)` = 24px is the standard page padding; cards are padded `p: 2` (16px) or `p: 2.5` (20px); form fields and list items use `gap: 1.5` (12px).
- Section rhythm in long-form pages (About) is `my: 6` (48px) between major blocks with a `<Divider>`.

### Backgrounds

- **Pure white** (`#fff`) is the default — pages, cards, modals. The only non-white background is the Login/Register page, which paints a subtle **radial gradient** behind the two-column layout: `radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))`. Full-bleed but extremely low-contrast (near-white → white).
- **`grey.50`** for summary/review blocks (e.g. the "Review Your Classification" block after you submit).
- **No patterns, textures, illustrations, or photography.**
- **One linear gradient** — the dashboard welcome tile: `linear-gradient(150deg, primary.main 0%, primary.dark 100%)` = `#1976d2 → #1565c0`. That is the only gradient in the entire product.

### Corner Radii

- `borderRadius: 1` → 4px (MUI's default shape) — buttons, chips, small inputs.
- `borderRadius: 2` → 8px — cards, paper surfaces, select-cards.
- `9999px` — circular avatars and the "step number" circles on the About page.
- No sharp 90° corners on interactive surfaces; no giant 24px+ radii either.

### Shadows & Elevation

- MUI's stock elevation ramp. Actually used:
  - `elevation={0}` on inner Papers with a `1px solid divider` border (the preferred style for cards on the dashboard & forms).
  - `elevation={2}` on stats cards.
  - `elevation={3}` on the main Classify panel and login Paper.
  - AppBar uses `boxShadow: 1`.
- **Focus state**: MUI's default outline ring (1px solid primary). No custom focus styles.
- **No inner shadows, no glow, no neumorphism.**

### Borders

- `1px solid divider` (`rgba(0,0,0,0.12)`) is the default card outline.
- Selected / active state uses `2px solid primary.main` and swaps the background to `rgba(25,118,210,0.08)` — both borders animate via `transition: all 0.15s ease`.
- **Left-border accent** is used in *one* place: the "canon blocks" on the About page have a `4px solid primary.main` (or `secondary.main`) left border with no other decoration. Reserved for that scholarly-annotation context — do not generalize to cards.

### Animation & Interaction

- **Duration**: 150ms for hover/press, 200ms for drawer collapse, 300ms for accordion expand. Never longer.
- **Easing**: `ease` (MUI default). No custom cubic-bezier.
- **Hover states** on clickable cards: background shifts to `rgba(0,0,0,0.03)` or `rgba(25,118,210,0.13)` (if already selected); border goes from `divider` → `text.disabled` or stays primary. The icon may `transform: scale(1.1)` and the chevron may `translateX(4px)` — both subtle.
- **Press states** are MUI's default ripple.
- **No bounce, no overshoot, no spring physics.**
- `scrollIntoView({ behavior: 'smooth' })` is used on mobile when the form step changes.

### Transparency & Blur

- Used rarely. The login background gradient is the main case. Popover surfaces are solid. No backdrop-filter, no frosted glass. Alpha is used for overlay colors (hover, selected) — that's it.

### Layout Rules

- Permanent left drawer on desktop (`md+`): 240px expanded, 64px collapsed (the default is *collapsed* — chevron opens it). Temporary drawer on mobile.
- AppBar variant in `DashboardNavbar.jsx` is declared but the SideMenu has superseded it — the sidebar owns the logo and user menu. Expect sidebar-only chrome.
- Page content is padded `p: 3` (24px) inside the main area.
- Full-height pages use `height: calc(100vh - 64px)` with internal scrolling panels (Classify splits 50/50 on desktop, stacks 50%/50% on mobile).
- Max content width: `Container maxWidth="lg"` (1200px) for About/legal, `xl` (1536px) for dashboards, raw 1200px on the Login page.
- **Fixed elements**: mobile-only "hamburger" IconButton at `top:10 left:10` with elevation when the drawer is closed. Nothing else is pinned.

### Cards

The card anatomy used throughout the product:
- `<Paper elevation={0}>` with `borderRadius: 2` (8px) and `border: 1px solid divider`.
- Inner padding 16–24px.
- Cards group by whitespace, not by color — the background stays white.
- Hover: border color darkens toward `text.disabled`; may gain a `boxShadow: inset 0 0 0 1px <accent>` for an extra "crispness" on the dashboard's quick-links cards.

### Avoid these (not in the brand)

- Heavy gradients, especially purple/violet blends.
- Emoji, stickers, mascots, hand-drawn illustrations.
- Dark-themed surfaces (the code has `theme.applyStyles('dark', …)` hooks but no dark mode is exposed to users).
- Colored left-border accent on generic cards (the pattern exists only on About-page canon blocks — don't generalize it).
- Serif display type, condensed type, script type.
- Drop-shadowed buttons, glowing CTAs, neon accents.
- Any color outside of the MUI 7 palette without a very specific reason.

---

## Iconography

- **Source**: the app uses **Material Icons** (`@mui/icons-material`, filled variant). There is **no custom icon set**, no brand-specific glyph library.
- **Substitution in this design system**: Material Icons require MUI at runtime, so the static preview cards and UI kit in this project load **[Material Symbols](https://fonts.google.com/icons)** from the Google Fonts CDN (Rounded, filled, 24dp). This is the official evolution of Material Icons and maps 1:1 by name — `<span class="material-symbols-rounded">dashboard</span>`. ⚠️ **Substitution flag**: visually Material Symbols Rounded is slightly softer than classic Material Icons; if pixel parity with the live app matters, swap to `material-icons` (filled) instead.
- **Icons actually used in the source** (partial list — names are both MUI and Material Symbols compatible):
  - Navigation: `dashboard`, `assignment`, `bar_chart`, `feed`, `forum`, `info`
  - Actions: `bookmark_border`, `share`, `open_in_new`, `rocket_launch`, `logout`, `person`, `notifications`, `chevron_right`, `chevron_left`, `menu`, `expand_more`
  - Classification categories: `biotech`, `psychology`, `help_outline`, `groups`, `fact_check`, `account_tree`, `trending_up`, `smart_toy`, `gavel`, `menu_book`
  - Stats: `assessment`, `people`, `trending_up`, `check_circle`, `timer`, `speed`, `emoji_events`
- **Usage rules**
  - Size: `fontSize="small"` (20px) in inline/list contexts; 24px default; 28px on dashboard quick-link tiles; 18px inside compact KPI rows.
  - Color: icons inherit `color` from the parent Typography by default; when used on a colored-selected card they shift to `primary.main`. On the white-on-color quick-link tiles, icons are `color: white` inside a `primary.main` rounded square.
  - Containers: dashboard quick-link icons sit in a `bgcolor: <categoryColor>; borderRadius: 2; p: 1.5` square.
- **Emoji**: **none** — see Content Fundamentals.
- **Unicode**: only `✓` (see above).
- **Logos**: the repo ships `public/vite.svg`, which is the default Vite starter. It is **not** a CitSci brand mark. See the CAVEATS section.

---

## File index

```
.
├── README.md                ← you are here
├── SKILL.md                 ← Agent-Skills-compatible entry point
├── colors_and_type.css      ← CSS variables: palette, type scale, radii, shadows
├── assets/
│   ├── README.md
│   ├── logo.svg             ← placeholder wordmark (see CAVEATS)
│   ├── logo-mark.svg        ← placeholder mark
│   └── favicon.svg
├── preview/                 ← static HTML cards surfaced by the Design System tab
│   ├── colors-primary.html
│   ├── colors-secondary.html
│   ├── colors-semantic.html
│   ├── colors-neutrals.html
│   ├── colors-alpha.html
│   ├── type-scale.html
│   ├── type-weights.html
│   ├── type-overline.html
│   ├── spacing-scale.html
│   ├── radii.html
│   ├── shadows.html
│   ├── iconography.html
│   ├── buttons.html
│   ├── chips.html
│   ├── text-fields.html
│   ├── alerts.html
│   ├── cards.html
│   ├── select-card.html
│   ├── stepper.html
│   └── logo.html
└── ui_kits/
    └── web/
        ├── README.md
        ├── index.html       ← interactive click-thru of the whole app
        ├── tokens.css
        ├── components.jsx   ← AppShell, SideMenu, TopBar, Avatar, Chip, Button, Field, Paper
        ├── classify.jsx     ← Classify screen: abstract panel + 4-step form
        ├── dashboard.jsx    ← Dashboard screen: welcome tile + KPIs + quick links
        ├── debates.jsx      ← Debates feed
        └── login.jsx        ← Login + register split-screen
```

---

## CAVEATS (read me)

1. **No real logo.** The codebase ships the default Vite starter (`public/vite.svg`) as its favicon. The `<Typography variant="h6" color="primary">CitSci Sort</Typography>` wordmark in the sidebar *is* the logo. I've included a placeholder mark (three sort bars inside a blue square) in `assets/` for contexts where a visual glyph is needed — please replace with the real Ibercivis/CitSci logo when you have one.
2. **No design system definition file.** There is no `theme.ts`, no design tokens export, no Storybook. Everything I documented was inferred from the MUI usage in components + the `createTheme()` call in `App.jsx`.
3. **No brand guidelines, no tone-of-voice doc, no marketing copy** other than what's embedded in the Login + About pages. The content fundamentals above are extrapolated from product copy.
4. **Fonts — Roboto is loaded from Google Fonts at runtime**, not bundled. `fonts/` is therefore empty in this system; if you need offline capability, please drop TTF/WOFF2 files there.
5. **Material Symbols vs. Material Icons substitution** — see ICONOGRAPHY above.
6. **No mobile app, no marketing site, no docs site, no slide template, no additional surfaces.** There is only one UI kit.
