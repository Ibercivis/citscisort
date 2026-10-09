# CitSci Sort Design System — SKILL.md

A scholarly, calm, Material-Design-3 system for the **CitSci Sort** web app — a community-driven classification tool for the citizen-science literature, from the Ibercivis Foundation.

## When to use this system

Use these tokens, components, and patterns whenever you design for CitSci Sort:
- New screens or flows inside the existing web app
- Emails, exported PDFs, or auxiliary tools that must feel like CitSci Sort
- Internal dashboards or admin panels for project maintainers
- Explainer decks or research posters about the project

Do **not** stretch this system to cover unrelated Ibercivis products or marketing sites — it's scoped to one product.

## Entry points

- **`README.md`** — the full, opinionated spec. Read this first. Covers content fundamentals (voice/tone, vocabulary, casing), visual foundations (color/type/spacing/radii/shadows/motion/layout), iconography, file index, and caveats about gaps in the source material.
- **`colors_and_type.css`** — drop-in CSS with all tokens as custom properties. `@import` it and use `var(--primary)`, `var(--text-h5)`, etc.
- **`preview/*.html`** — one card per token family or component. Look here to see how a thing is supposed to look before you reimplement it.
- **`ui_kits/web/index.html`** — interactive click-thru of the five main product surfaces (Dashboard, Classify, Debates, Stats, Login). Steal layouts and component compositions from here.
- **`assets/`** — placeholder logo mark + wordmark. The mark visualizes the core sort: one paper forking into a filled "Science" bin and an outlined "Meta-science" bin.

## Core rules (the non-negotiables)

1. **Primary is MUI blue 700 (`#1976d2`). Secondary is crimson (`#dc004e`) and is a rare accent — never the main color.** Do not introduce a third brand color.
2. **Typography is Roboto, MUI default scale, unchanged.** No serifs, no display fonts, no custom tracking beyond what's in `colors_and_type.css`.
3. **Pure white surfaces. One gradient only** (the dashboard welcome tile). No patterns, no illustrations, no photography.
4. **Cards use `elevation=0 + 1px divider border`** by default. Shadows are reserved for stats cards (e2), the classify panel (e3), and the login paper (e3).
5. **Interaction is calm.** 150ms ease. No bounce, no springs, no shimmer. Hover shifts by ~4–8% opacity and maybe a border color. That's it.
6. **Selected-state vocabulary is fixed**: `2px solid primary` border + `rgba(25,118,210,0.08)` fill + a circular ✓ badge in the top-right. Use `select-card.html` as the reference.
7. **Overline labels are the signature type treatment** — 12px / 400 / +1px tracking / UPPERCASE, for "AUTHORS", "ABSTRACT", "KEYWORDS", etc.
8. **Icons are Material Symbols Rounded, filled, 24dp.** The live app uses `@mui/icons-material` (classic Material Icons) — Symbols Rounded is the design-system stand-in. Names map 1:1.
9. **No emoji in product UI.** The one decorative glyph is a Unicode `✓` on the selected card.
10. **Voice is scholarly and explanatory.** Precise vocabulary (abstract, taxonomy, canon, corpus). No marketing superlatives. Sentence case throughout; Title Case only for nav labels and proper nouns.

## Quick copy patterns

- Empty state (calm): *"You're all caught up!"*
- Form instruction: *"Select all aspects that apply — multiple selections are expected."*
- Post-submit hook: *"Have something to debate about this paper with the community?"*
- Conditional step label: *"Platforms · if applicable"*
- Help text: *"Press Enter to add a platform not in the list"*

## How to use tokens

```html
<link rel="stylesheet" href="colors_and_type.css">
<button style="background:var(--primary); color:#fff; font:var(--text-button); letter-spacing:0.4px; text-transform:uppercase; border-radius:var(--radius-sm); padding:var(--space-1) var(--space-2); box-shadow:var(--shadow-2)">
  Submit
</button>
```

## What is NOT in this system (and why)

- **A real brand logo.** The repo ships Vite's default starter SVG. `assets/logo.svg` is a proposal, not official. Replace when a real mark exists.
- **A dark-mode palette.** MUI's dark-mode hooks exist in code but no dark surfaces are exposed to users.
- **A mobile-app, marketing-site, or deck theme.** The product is web-only today.
- **Motion specs beyond micro-interactions.** There are no hero animations or page-transition choreography in the app.
- **A component library with variants matrix.** This is a documentation system, not a compiled library. Copy patterns from the UI kit; don't expect packaged React components.

## Caveats

See the CAVEATS section of `README.md` for the full list. Most important: the visual language was inferred from MUI 7 usage across `src/pages/*` and `src/components/*` — there is no authored theme spec in the source tree.
