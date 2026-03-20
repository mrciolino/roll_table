# 5e Scroll Pack Opener

A D&D 5e spell scroll pack-opener built with React 19, TypeScript, Vite 7, and Tailwind CSS v4. Simulates opening booster-style packs of spell scroll cards with weighted rarity draws, a shiny mechanic, and a full-screen card viewer.

## Features

- **Configurable packs** — set your gold budget, gold-per-pack price, cards per pack, and conjuration/staple split
- **Weighted rarity draws** — editable weight sliders for Common, Uncommon, Rare, Very Rare, and Legendary
- **Two spell pools** — Conjuration spells (default 75%) and Staple spells (default 25%), automatically derived from the spell school in the image filename
- **Shiny cards** — 1% chance per draw; shiny cards get a silver shimmer overlay
- **Lightbox viewer** — click any card to open a full-screen modal with keyboard and button navigation
- **Session stats** — live counters for opened packs/cards, pool splits, average level, and shiny pulls
- **Rarity & school breakdowns** — per-rarity and per-school aggregate counts in the right rail

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

To build and type-check:

```bash
npm run build      # runs tsc -b && vite build
npm run preview    # preview the production build
```

> There is no separate `typecheck` script — `npm run build` is the canonical way to validate TypeScript.

## Project structure

```
src/
  App.tsx              # Entire UI — single component, all state
  styles.css           # Tailwind v4 import + global resets + .shiny-card shimmer
  data/
    spells.ts          # Loads spell images via import.meta.glob, parses metadata from filename
    Spells/
      0 - Cantrips/    # PNG files for cantrip spell cards
      1st/             # PNG files for level 1 spell cards
      2nd/ … 9th/
  utils/
    roll.ts            # weightedPick<T>, randomInt, pickOne — pure math, no side effects
```

## Adding spells

Drop `.png` image files into the appropriate level folder:

```
src/data/Spells/3rd/3-Fireball-Evocation.png
```

**Filename convention:** `<level>-<Spell Name>-<School>.png`

- The level prefix must match the folder (e.g. `3` in `3rd/`)
- School must be one of: `Abjuration`, `Conjuration`, `Divination`, `Enchantment`, `Evocation`, `Illusion`, `Necromancy`, `Transmutation`
- Conjuration school → `conjuration` pool automatically; all others → `staple` pool
- `import.meta.glob` picks up new files at build time — **no code changes needed**

## Rarity mapping

Rarity is derived from spell level at build time:

| Level | Rarity |
|-------|--------|
| 0–1   | Common |
| 2     | Uncommon |
| 3     | Rare |
| 4–5   | Very Rare |
| 6–9   | Legendary |

Default draw weights (configurable in the UI): Common 42 · Uncommon 28 · Rare 18 · Very Rare 8 · Legendary 4

## Defaults (from `src/data/spells.ts`)

| Setting | Default |
|---------|---------|
| Gold per pack | 50 gp |
| Cards per pack | 5 |
| Conjuration rate | 75% |

## Keyboard shortcuts (modal)

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / next card in pack |
| `↑` / `↓` | Previous / next pack |
| `Esc` | Close modal |

## Tech stack

- **React 19** + **TypeScript 5**
- **Vite 7** with `@vitejs/plugin-react`
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.ts`)
- No routing, no backend, no tests

