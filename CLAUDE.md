# CLAUDE.md

Guidance for working in this repo. Keep it current — see **Keeping this file current** at the end.

## What this is

A TTRPG character web app. The UI is a scanned/traced character-sheet
image exported as an SVG, with interactive HTML form controls overlaid exactly
on top of the printed fields. Field values persist to `localStorage`; a few
fields (e.g. ability modifiers) are computed from others.

Stack: React 19 + TypeScript, Vite, [jotai](https://jotai.org) for state,
Vitest for tests, ESLint. Package manager: **yarn** (yarn 1.x, see
`packageManager` in `package.json`).

## Commands

- `yarn dev` — Vite dev server with HMR.
- `yarn build` — type-check (`tsc -b`) then Vite production build.
- `yarn lint` — ESLint over the repo.
- `yarn preview` — serve the built `dist/`.
- `yarn test` — Vitest (default config; test files are `*.test.ts` colocated with source).

## Core architecture

The whole sheet is one `<svg viewBox="0 0 816 1055.867">`. Inside it:

1. The artwork SVG (`public/character-sheet/character-sheet.svg`) is fetched at
   runtime, its inner markup extracted and injected via `dangerouslySetInnerHTML`.
2. Interactive fields are rendered as `<foreignObject>` elements **in the same
   viewBox coordinate space** as the artwork, so the browser scales artwork and
   inputs together — there is no pixel/resize tracking.

Key idea: **every field is a node** carrying both its layout (`def`) and the
jotai atom holding its value. Position and state are one object.

### Field node model (`src/types/`, `src/lib/fieldNodes.ts`)

- `FieldDefinition` — layout for one field: `id`, `x/y/width/height` (viewBox
  units, **not pixels**), `type` (`text | textarea | number | check`), and
  optional `shape`, `color`, `fontSize`, `textAlign`, `defaultValue`.
- `FieldNode` — an `InputNode` (writable atom; either persisted via
  `atomWithStorage` or computed-with-fallback) or a `DerivedNode` (read-only
  atom computed from other atoms, not persisted). An `InputNode` may carry an
  optional `readOnlyAtom` that locks editing at runtime.
- `createFieldFactory(prefix)` returns `inputNode` and `computedInputNode`
  builders bound to a storage-key prefix. **One factory instance per form** —
  see `layout/nodes.ts`; do not create another, or fields would split across
  localStorage namespaces.
- `derivedNode(def, read)` builds a computed field.
- `computedInputNode(def, enabled, compute)` builds a hybrid field: while the
  `enabled` atom is true it shows `compute(get)` and is read-only; otherwise it
  is an ordinary editable, persisted input (e.g. passive Perception, auto-calc
  toggled by a checkbox).
- `collectNodes(tree)` flattens a `NodeTree` (nodes nested in arrays / records)
  into a flat render list. `numberGrid(...)` is a helper for grid-placed number
  fields.

### CharacterSheet feature (`src/components/features/CharacterSheet/`)

- `layout/` — the **single source of truth** for the sheet's fields.
  - `sheet.ts` — assembles all sections into the `sheet` tree and exports the
    flat `Fields` list (`collectNodes(sheet)`). Each field is created exactly
    once, in its section module.
  - `layout/nodes.ts` — the one shared `inputNode` factory (prefix
    `'characterSheet'`).
  - `layout/sections/*.ts` — field definitions grouped by sheet region
    (`header`, `abilities`, `combat`, `spells`, `traits`). Each section owns the
    repeated-row builders and step constants it alone uses — the ability-block
    generator in `abilities.ts` (skill rows interpolated between real artwork
    anchors), the weapon/cantrip/spell-slot builders in `spells.ts`, the
    damage-grid builder in `traits.ts`. Only builders/constants shared by more
    than one section belong in a common `generators.ts`/`constants.ts` module.
  - `logic/formulas.ts` — **pure** D&D 5e rules math (no atoms/React/storage),
    unit-tested in `formulas.test.ts`. Atoms wire these into derived fields.
  - `CharacterSheet.tsx` — fetches/injects the artwork SVG and renders `Fields`.

### UI controls (`src/components/ui/`)

`FieldInput` picks the control for a field's `type`: `NumericInput`,
`AutoFitInput` (text), `AutoFitTextarea`, `CheckInput`. `FieldForeignObject`
positions any control in SVG coordinate space. Writable fields two-way bind to
their atom (and go read-only when their optional `readOnlyAtom` is true); derived
fields subscribe read-only.

## Conventions

### Documentation

All code documentation is concise and purpose-driven.

- **Document every** type, function, React component, and class — say what it is
  for, not how it works internally. Leave out branching, edge cases, and
  reasoning.
- **Use `/** */` docblocks** of 120 characters wide for the doc comment on any type, function,
  component, class, or file-overview header — always the multiline form, even
  for a one-line description:

  ```ts
  /**
   * Flattens a node tree into a render list of its field nodes.
   */
  export function collectNodes(tree: NodeTree): FieldNode[] { … }
  ```

  Section dividers (`// ---- … ----`), inline comments inside a function body,
  and trailing/member comments stay `//` line comments.
- **Branching code** (`if`, `switch`/`case`, loops, etc.) carries at most a terse
  statement of its purpose — no explanation of the logic itself.

### Logic vs. layout

Any logic separable from layout must be separated from it, written in a
functional style (pure functions — values in, values out; no side effects), and
unit tested. `logic/formulas.ts` + `formulas.test.ts` is the model: rules math
lives apart from field definitions, and layout wires the pure functions in via
`derivedNode`.

### General

- Add or change a field only in its `layout/sections/*` module; never duplicate a
  field id. Logic reads fields by reference through the `sheet` tree
  (e.g. `sheet.abilities.strength.score.atom`), not by id lookup.
- Keep rules math in `logic/formulas.ts` pure and tested; wire it via
  `derivedNode`.
- TS is strict-ish: `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax`
  (use `import type` for types), and `.ts`/`.tsx` extensions are included in
  relative imports.
- In `src/lib/` and `logic/`, declare named functions with the `function`
  keyword, not `const` arrow lambdas (arrows are fine for inline callbacks). UI
  components elsewhere keep their existing arrow/`function` style.

## Positioning helper skills

Placing overlays against the artwork is aided by project skills: `locate-svg-label`
(text labels), `locate-svg-circle` (single value circle), `locate-svg-checks`
(round tick-boxes). They require the dev server running with the SVG inlined.

## Notes

- `public` hold folders with source artwork assets.

## Keeping this file current

When you change anything this file describes — build/scripts, the field-node
architecture, the layout/logic module structure, UI controls, or the
conventions above — update the relevant section **in the same change**. This
applies to any architectural part of the app, not just the field-node system.
If you add a new feature directory or a new section module, document it here.
