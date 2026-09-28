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
  builders bound to a storage-key prefix. **One factory instance per sheet
  instance** — `layout/nodes.ts`'s `createSheetFactory(prefix)` bundles those
  two with `derivedNode` into a `SheetFactory`, and each sheet page passes its
  own prefix so its fields get an isolated localStorage namespace. Within one
  sheet, all fields must come from that single factory, or they would split
  across namespaces.
- `derivedNode(def, read)` builds a computed field.
- `computedInputNode(def, enabled, compute)` builds a hybrid field: while the
  `enabled` atom is true it shows `compute(get)` and is read-only; otherwise it
  is an ordinary editable, persisted input (e.g. passive Perception, auto-calc
  toggled by a checkbox).
- `collectNodes(tree)` flattens a `NodeTree` (nodes nested in arrays / records)
  into a flat render list. `numberGrid(...)` is a helper for grid-placed number
  fields.

### CharacterSheet feature (`src/components/features/CharacterSheet/`)

- `layout/` — the **single source of truth** for the sheet's fields. The sheet
  is built **per instance** from a storage prefix (so multiple sheet pages get
  isolated namespaces), not as module-level singletons.
  - `sheet.ts` — exports `buildSheet(storagePrefix)`, which creates the sheet's
    factory, calls each section builder with it, and returns `{tree, fields}`
    (the structured tree for logic access + the flat `collectNodes(tree)` render
    list). Each field is created exactly once, in its section builder.
  - `layout/nodes.ts` — `createSheetFactory(prefix)`, the per-instance factory
    (`inputNode`/`computedInputNode`/`derivedNode`) every section builder draws
    from.
  - `layout/sections/*.ts` — each exports a `build<Section>(factory)` function
    returning that region's nodes (`buildHeader`, `buildAbilities`,
    `buildCombat`, `buildSpells`, `buildTraits`). A section owns the
    repeated-row builders and step constants it alone uses — the ability-block
    generator in `abilities.ts` (skill rows interpolated between real artwork
    anchors; `buildAbilities` returns both `abilityMeta` and `abilities` since
    their derivations reference each other), the weapon/cantrip/spell-slot
    builders in `spells.ts`, the damage-grid builder in `traits.ts`. Only
    builders/constants shared by more than one section belong in a common
    `generators.ts`/`constants.ts` module.
  - `logic/formulas.ts` — **pure** D&D 5e rules math (no atoms/React/storage),
    unit-tested in `formulas.test.ts`. Atoms wire these into derived fields.
  - `CharacterSheet.tsx` — takes a `storagePrefix` prop, memoizes
    `buildSheet(prefix)`, fetches/injects the artwork SVG, and renders the
    resulting `fields`.

### Library feature (`src/App.tsx`, `src/components/features/Library/`)

`App` is a thin root that just renders the `Library` feature. The **library**
holds many **binders**: a `LibraryBinder` is serialisable metadata (`id`,
`label`, `hue`), where `id` is a `crypto.randomUUID()` GUID (minted by
`logic/binderId.ts`'s `binderId()`, unit-tested in `binderId.test.ts`) that
survives renames and is the **storage-prefix root every one of the binder's
pages persists under**. The binder list lives in `atomWithStorage('binders', …)`,
**empty by default**; the open binder's id persists via
`atomWithStorage('openBinder', …)` so a reload reopens it.

`Library.tsx` shows either a **shelf** — a wooden bookcase (`Library.css`) with
each binder rendered face-out as a hue-tinted book **cover** (a circular
placeholder portrait showing the name's first letter above the name, with room
reserved for a future character portrait), edit/delete `IconButton`s surfacing on
hover — or, when a binder is open,
the `Binder` bound to that binder's id (`<Binder storagePrefix={id} onExit=…/>`,
keyed by id so it remounts per binder). Adding/editing/deleting a binder go
through the `Modal`-based dialogues in `BinderDialogs.tsx`/`.css` (`AddBinderModal`
takes a name; `EditBinderModal` renames + recolours the spine via a hue slider,
presets, and live preview; `DeleteBinderModal` confirms, warning all the binder's
pages are removed). Default spine hues reuse the binder feature's
`logic/tabHue.ts`. A fixed **Add binder** `IconButton` sits in the corner.

### Binder feature (`src/components/features/Binder/`)

`Binder` (`Binder.tsx`) is rendered per-open-binder by `Library` and takes a
`storagePrefix` (the binder's id) and an `onExit` callback (back to the shelf).
It owns the whole page area: it renders the active page in a `.page` wrapper
(`Binder.css`, which only carries the drop shadow and reserves room for the tabs
— the page content styles itself) beside its `Tabs` strip
(`Tabs.tsx`/`Tabs.css`), both inside a full-width `.app-shell`. `Tabs` is
feature-specific, so it lives in the feature folder, not in `ui/`;
`logic/tabHue.ts` holds its pure per-index hue function.

The page list is **dynamic and persisted**: a `Page` is serialisable tab
metadata (`id`, `label`, `type`, `storagePrefix`), and
`renderPage(page, storagePrefix)` resolves it to an element by `type` —
`characterSheet` → `CharacterSheet` bound to the **binder-prefixed** storage
prefix `${storagePrefix}:${page.storagePrefix}`, `empty` → an `EmptyPage` titled
by its label. Page types live in `pageTypes.ts` (`PageType`, `PAGE_TYPES`). The
page list and active page are **per-binder** atoms built in `makeBinderAtoms` —
`atomWithStorage('${prefix}:pages', …)` (**empty by default** — the binder starts
with no pages until the user adds one) and `atomWithStorage('${prefix}:activePage',
…)` — so each binder keeps an isolated namespace; the view scale
(`atomWithStorage('pageScale', …)`) is shared across binders. `EmptyPage`
(`features/EmptyPage/`) is both the stand-in for an `empty`-type page and the
page shown when the binder has no active page (`Binder` renders `<EmptyPage/>`
untitled in that case). The `empty` type is offered in the add-page menu for now
but is slated for removal from that list later.

Adding a page is driven from `TabControls` (below), which opens `AddPageModal`
(`AddPageModal.tsx`) — a proper modal (not `window.prompt`) asking for a
**name** and a **type**. On submit `Binder.createPage` mints the id
via `logic/pageId.ts` (`pageId()`, a `crypto.randomUUID()` GUID, unit-tested in
`pageId.test.ts`) — an opaque id decoupled from the name so it survives renames;
that id is also the character sheet's `storagePrefix`, and the new page becomes
active.

`TabControls` (`TabControls.tsx`/`.css`) is a vertical cluster of round
`IconButton`s in the gutter right of the tab strip, plus a **Back to library**
button (calls `onExit`) pinned to the top-left viewport corner. The cluster's
**Add page** and **Print** buttons are always shown (adding is the only way to
add a page — there is no "+" tab; Print calls `window.print()`); the edit and
delete buttons act on the **active** tab and appear only when one is active
(`hasActive`). A `@media
print` block in `Binder.css` hides the tab strip and controls and zeroes the
margins so only the page content prints. The two edit dialogues live in `TabDialogs.tsx`/`.css`
(`EditTabModal`, `DeleteTabModal`, both built on the shared `Modal`): edit renames
the label (the id/`storagePrefix` and stored fields are untouched) and recolours
the tab `hue` via a slider + preset swatches with a live preview, both in one
dialogue; delete asks for confirmation. `Binder` owns the handlers (`createPage`,
and `editPage`/`deletePage`, which patch or drop the active page in the persisted
list; delete then activates a neighbour).

`Tabs` is the binder-style tab strip anchored to the page's right edge:
labels rotated 90° CCW (`writing-mode: vertical-rl` + 180° rotation), one muted
paper-tab hue per tab index. The strip sits flush against the page's right edge
(the page reserves its width); the active tab is lifted with a drop shadow. Tabs can be
dragged vertically to reorder (transform-based, so displaced tabs glide via the CSS
`transform` transition); the drag also navigates to the tab (its click fires as normal),
and drops are committed via `onReorder(from, to)` (`Binder` reorders and persists the
`pages` list).

### UI controls (`src/components/ui/`)

`FieldInput` picks the control for a field's `type`: `NumericInput`,
`AutoFitInput` (text), `AutoFitTextarea`, `CheckInput`. `FieldForeignObject`
positions any control in SVG coordinate space. Writable fields two-way bind to
their atom (and go read-only when their optional `readOnlyAtom` is true); derived
fields subscribe read-only.

`PaperPage` is the shared white, A4-proportioned document-style page shell (its
one style, so it never drifts): both `EmptyPage` and the `CharacterSheet`
loading state wrap their content in it.

`Modal` is the shared dialogue shell: a titled box over a dimmed backdrop that
closes on a backdrop click or Escape, with callers supplying the body. It also
carries the **shared form styling** every dialogue uses so they stay uniform —
`.modal__body` (the flex column), `.modal__field` (a labelled input/select), and
`.modal__actions` with `.modal__btn` buttons (`--primary`/`--danger` variants,
styled purely by class so a variant never loses a specificity battle). `Binder`'s
`AddPageModal` and `TabDialogs` are built on it, supplying only their own form
markup (and, for the colour picker, its swatch/preset styling in `TabDialogs.css`).

`IconButton` is the shared round, Material-style button: an icon at rest with a
floating text-label pill that fades in on hover/focus. Props are `icon`, `label`
(used as both the pill text and the accessible name), `onClick`, an optional
`labelSide` (`left`/`right`) and `variant` (`default`/`danger`). Callers control
stacking via the surrounding container so the pill can sit above neighbours (e.g.
`Binder`'s `TabControls` gives its cluster a high `z-index`).

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
  export function collectNodes(tree: NodeTree): FieldNode[] { }
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
