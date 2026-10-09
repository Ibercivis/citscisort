# Web UI Kit

Interactive click-thru of the five main surfaces of the CitSci Sort web app.

## Open it

[`index.html`](./index.html) — load in a browser. Top center has a pill toolbar to jump between screens; each screen also deep-links from the sidebar navigation. State persists across reloads via `localStorage` (`citsci-kit-screen`).

## Screens included

| Screen | What it shows |
| --- | --- |
| **Dashboard** | Welcome gradient tile, 4 KPI cards, 3 quick-link tiles, recent-activity feed. Uses the only gradient in the product. |
| **Classify** | The core workflow — 50/50 split with abstract on the left and the 4-step classification form on the right. Shows the select-card primitive in its multi-select mode (step 2: meta-research aspects). Click cards to toggle. |
| **Debates** | Community threads on individual abstracts. Demonstrates the filter-chip row, debate card anatomy, and the follow/unfollow affordances. |
| **Stats** | Project-wide dashboard with KPI strip, keyword treemap (CSS-only approximation of the Recharts version), and a compact category-distribution panel. |
| **Login** | Two-column split. Left = hero with the three-bullet value prop. Right = signin card with email/password + Google OAuth, wrapped in the subtle radial-gradient background that is the login page's signature. |

## What's tokenized, what's not

`tokens.css` pulls in `colors_and_type.css` from the system root and layers kit-specific component styles on top (sidebar, topbar, select-card, debate card, etc.). If you want to build a new screen, you can import `tokens.css` directly and reuse the helper classes (`.btn-primary`, `.paper`, `.chip`, `.sc`, etc.).

## Interactions wired up

- **Screen switcher** (top toolbar + sidebar nav items) — persisted to localStorage
- **Sidebar collapse** — hamburger button in the topbar, grid switches 240px → 64px
- **Select-card toggle** — any `.sc` on the Classify screen can be clicked; selected adds the ✓ badge and swaps to primary border / alpha fill
- **Hover states** — implemented via CSS; no JS wiring

## Interactions NOT wired up (intentional)

- Form submission, login flow, real data — this is a visual kit, not a functional prototype.
- Real Recharts treemap — the stats screen uses a CSS-grid stand-in. Swap in Recharts at implementation time.
- Dark mode. The app has no dark surface in production.

## Known limitations / things to watch

- **Material Symbols Rounded** is loaded from the Google Fonts CDN. The live app uses classic Material Icons via MUI — visually ~95% the same. If pixel parity matters, swap the stylesheet for `material-icons` filled.
- **Responsive** collapses to a single column below 960px, with the sidebar hidden. The real app uses a temporary Drawer on mobile — not shown here, but the pattern is in the source repo.
- **Roboto** is also CDN-loaded. For offline, drop `.woff2` files into a `fonts/` folder and rewrite the `@font-face`.
