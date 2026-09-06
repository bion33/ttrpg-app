# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working conventions

- Do not spawn subagents (the Agent tool) without the user's explicit permission first.

## Commands

- `yarn dev` — start the Vite dev server
- `yarn build` — type-check (`tsc -b`) and build for production
- `yarn lint` — run ESLint over the project
- `yarn preview` — preview the production build

There is no test suite configured in this project.

## Architecture

This is a single-page D&D 5e character sheet built with React 19 + TypeScript + Vite, styled to look like a physical paper character sheet. There is no backend or router — all state lives in the browser.

**State model**: `CharacterSheetData` (src/types.ts) is the single shape describing the entire character sheet (overview, abilities, combat, weapons, spells, hit dice, death saves, proficiencies, notes, etc). It is provided app-wide via `CharacterSheetProvider` (src/context/CharacterSheetContext.tsx), which persists it to `localStorage` through `useLocalStorageState` (src/hooks/useLocalStorageState.ts) under the key `dnd-character-sheet`. Components read/write it via `useCharacterSheet()` (src/context/useCharacterSheet.ts), which exposes `{ sheet, updateSheet, resetSheet }`. `updateSheet` takes an updater function `(current) => next` and components spread-and-patch the relevant slice, e.g.:

```ts
updateSheet((current) => ({...current, abilities: {...current.abilities, [key]: data}}))
```

Default/blank sheet values come from `createDefaultCharacterSheet()` in src/data/defaultCharacterSheet.ts.

**Component layout**: `App.tsx` renders `AppToolbar` and `CharacterSheet`. `CharacterSheet` composes the page out of section/column components under `src/components/`:
- `OverviewSection` — character name/class/race header fields
- `AbilitiesColumn` — the six ability blocks + proficiency stats
- `CombatColumn` — HP, vitals, weapons, spells, spell slots
- `DetailsColumn` — hit dice, death saves, proficiencies, features, resistances
- `NotesSection` — free-form notes

Each component folder pairs a `.tsx` with a `.module.css` (CSS Modules) of the same name. Reusable primitives live in `src/components/shared/` (`SheetField`, `SectionLabel`, `ColumnHeading`, `DiamondCheckbox`, `InkCheckbox`) — prefer these over ad hoc inputs/checkboxes when adding new fields, since they implement the shared paper/ink visual style.

**Styling**: global design tokens (colors, fonts, radii) are defined as CSS custom properties in `src/styles/tokens.css` and consumed by component CSS Modules — reuse these tokens rather than hardcoding new colors/fonts.

**Assets**: `public/assets/character-sheet.svg` is the source artwork sheet; some visual elements (checkboxes, icons) have been extracted from it into standalone components (see the `extract-svg-component` skill for that workflow). Third-party asset attributions are tracked in `ATTRIBUTION.md`.
