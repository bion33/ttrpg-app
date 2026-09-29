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

Key idea: **every field is a node** carrying both its layout (`definition`) and
the jotai atom holding its value. Position and state are one object.

### Field node model (`src/types/`, `src/lib/fieldNodes.ts`)

- `FieldDefinition` — layout for one field: `id`, `x/y/width/height` (viewBox
  units, **not pixels**), `type` (`text | textarea | number | check`), and
  optional `fontSize`, `textAlign`, `defaultValue`. Per-type extras live in
  subtypes (like `CheckFieldDefinition`), never as flags on the base type:
  `CheckFieldDefinition` adds `shape`/`color`; `NumericFieldDefinition` adds
  `signed` (display the value with an explicit leading sign, e.g. a `+3` modifier).
- **Typed values.** An atom holds the field's *natural* type — `string`
  (text/textarea), `number | null` (number, `null` = empty), or `boolean` (check).
  `InputNode<T>`/`DerivedNode<T>` are generic over that value type, so cross-field
  logic reads atoms **directly** (`get(score.atom)` is `number | null`,
  `get(proficiency.atom)` is `boolean`) with no parsing. Parsing and formatting
  (including `signed`) live only in the UI controls — the single boundary. (No
  storage migration: values persist in the typed form, so pre-typed localStorage
  data is not read back.)
- `FieldNode` — an `InputNode` (writable atom; either persisted via
  `atomWithStorage` or computed-with-fallback) or a `DerivedNode` (read-only
  atom computed from other atoms, not persisted). An `InputNode` may carry an
  optional `readOnlyAtom` that locks editing at runtime. (The `FieldNode` union
  lists the concrete `InputNode<…>` value types explicitly, since a writable
  atom's value type is invariant.)
- `createFieldFactory(prefix)` returns `inputNode`, `checkNode`, and
  `computedInputNode` builders bound to a storage-key prefix. **One factory
  instance per sheet instance** — `layout/nodes.ts`'s `createSheetFactory(prefix)`
  bundles those three with `derivedNode` into a `SheetFactory`, and each sheet
  page passes its own prefix so its fields get an isolated localStorage
  namespace. Within one sheet, all fields must come from that single factory, or
  they would split across namespaces.
- `checkNode(definition)` builds a persisted checkbox field from a `CheckFieldDefinition`
  (an `inputNode` typed to check defs); use it for any check field carrying a
  `shape`/`color` so no `as CheckFieldDefinition` cast is needed.
- `derivedNode(definition, read)` builds a computed field.
- `computedInputNode(definition, enabled, compute)` builds a hybrid field: while the
  `enabled` atom is true it shows `compute(get)` and is read-only; otherwise it
  is an ordinary editable, persisted input (e.g. passive Perception, auto-calc
  toggled by a checkbox).
- `collectNodes(tree)` flattens a `NodeTree` (nodes nested in arrays / records)
  into a flat render list.

### CharacterSheet feature (`src/components/features/CharacterSheet/`)

- `layout/` — the **single source of truth** for the sheet's fields. The sheet
  is built **per instance** from a storage prefix (so multiple sheet pages get
  isolated namespaces), not as module-level singletons.
  - `sheet.ts` — exports `buildSheet(storagePrefix)`, which creates the sheet's
    factory, calls each section builder with it, gathers their nodes into a
    structured tree, and returns `{fields}` (the flat `collectNodes(tree)` render
    list; the tree itself is internal and not exposed). Each field is created
    exactly once, in its section builder.
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
holds many **binders**: a `LibraryBinderItem` is serialisable metadata (`id`,
`label`, `hue`), where `id` is a `crypto.randomUUID()` GUID (minted by
`src/lib/newId.ts`'s `newId()`, unit-tested in `newId.test.ts`, shared with the
binder's page ids) that survives renames and is the **storage-prefix root every
one of the binder's pages persists under**. The binder list lives in `atomWithStorage('binders', …)`,
**empty by default**. Which binder is open — and which page within it — is the
app's single **location** (see the navigation hook below), persisted so a reload
reopens the same binder and page; the library shows the grid when the location's
binder id is empty.

`Library.tsx` shows either the **grid** — an even grid (`Library.css`, columns
and rows equally spaced, on the same `#e9e4d8` backdrop as the page area) of
binder **covers**. Each cover is a `LibraryBinder` (`Library/LibraryBinder.tsx`) — a hue-tinted
rectangle with a circular placeholder
portrait showing the name's first letter above the name (room reserved for a
future character portrait), edit/delete `IconButton`s surfacing on
hover; `Library` maps binders → `<LibraryBinder>` (plus one ghost `<LibraryBinder>`) and stays
responsible for the binder collection and modal orchestration. Each cover has a
deliberately **messy** look: loose cream **papers** poke
out from behind it at odd angles (with shadows), and **decorative, non-functional
binder tabs** tuck along its right edge — **the real page-tab strip markup
(`Binder/tabs/Tabs.css`'s `.tabs` classes) reused as-is and shrunk by a plain CSS
`scale`**, so labels/hues/overlap match the actual tabs exactly, just tiny. It
draws **one tab per real page in the binder, in that page's stored hue and
label**. Each cover subscribes to that binder's shared `pagesAtom`/`activePageAtom`
(`Binder/binderAtoms.ts`, below), so the shelf stays reactive to page changes and
reads no `localStorage` itself, and `logic/binderTabs.ts`'s `binderTabs` (pure,
unit-tested in `binderTabs.test.ts`) projects the persisted page list to each tab's
label and hue. The stable per-sheet paper
offset/rotation comes from `logic/bookJitter.ts` (pure, seeded off the binder id,
unit-tested in `bookJitter.test.ts`), so a book's mess is consistent across
renders. When a binder is open the grid gives way to
the `Binder` bound to that binder's id (`<Binder storagePrefix={id} onExit=…/>`,
keyed by id so it remounts per binder). Adding/editing/deleting a binder go
through the `Modal`-based modals in `modals/`, one component per file
(`AddBinderModal.tsx` takes a name; `EditBinderModal.tsx` renames + recolours the
spine via the shared `ui/ColorPicker`); deleting reuses the shared
`ui/ConfirmModal`, warning all the binder's pages are removed. Default spine hues
reuse the shared `src/lib/tabHue.ts`. Adding is driven by a **ghost binder** —
the same `LibraryBinder` markup faded to a low opacity (`.library__binder--ghost`, the
`ghost` variant), with a plus icon in the portrait in place of a letter and the
name "Add binder". It sits in the grid's last cell after the existing covers and
opens `AddBinderModal`; there is no separate corner button, and an empty library
shows just the ghost cover.

### Binder feature (`src/components/features/Binder/`)

`Binder` (`Binder.tsx`) is rendered per-open-binder by `Library` and takes a
`storagePrefix` (the binder's id) and an `onExit` callback (back to the grid).
It owns the whole page area: it renders the active page in a `.page` wrapper
(`Binder.css`, which only carries the drop shadow and reserves room for the tabs
— the page content styles itself) beside its `Tabs` strip
(`tabs/Tabs.tsx`/`tabs/Tabs.css`), both inside a full-width `.app-shell`. The
tab-strip components live together in a `tabs/` subfolder (`Tabs`,
`TabControls`), with the tab modals in a nested `tabs/modals/` (`AddTabModal`,
`EditTabModal`); they are feature-specific, so they live in the feature folder,
not in `ui/` (tab deletion reuses the shared `ui/ConfirmModal`). The pure
per-index tab-hue function lives in `src/lib/tabHue.ts` (shared by `Binder` and
`Library`, unit-tested in `tabHue.test.ts`). Page-view zoom is owned by the
`usePageScale` hook (`src/hooks/`), not `Binder` itself.

The page list is **dynamic and persisted**: a `Page` is serialisable tab
metadata (`id`, `label`, `type`, `storagePrefix`), declared with the per-binder
atoms in `binderAtoms.ts`, and `renderPage(page, storagePrefix)` (in `Binder.tsx`)
resolves it to an element by `type` — `characterSheet` → `CharacterSheet` bound to
the **binder-prefixed** storage prefix `${storagePrefix}:${page.storagePrefix}`,
`empty` → an `EmptyPage` titled by its label. Page types live in `pageTypes.ts`
(`PageType`, `PAGE_TYPES`). The page list is a **per-binder** atom from
`binderAtoms.ts`'s `pagesAtom(prefix)` — `atomWithStorage('${prefix}:pages', …)`,
one **shared, cached instance per prefix** so the binder and the library shelf read
the same list (**empty by default** — the binder starts with no pages until the
user adds one) — so each binder keeps an isolated namespace. The **active page is
the app-wide location** (see the navigation hook below), not a per-binder atom;
`binderAtoms.ts` also owns `activePageAtom(prefix)`
(`atomWithStorage('${prefix}:activePage', …)`), but only as **last-viewed-page
memory** — `Binder` writes the shown page to it so the library can reopen the
binder at that page (the library reads the id straight from that shared atom). Page
navigation (opening a binder, selecting a tab, adding
or deleting a page) goes through `useNavigate`, so each move is a browser-history
entry. The view scale
(`usePageScale`'s `atomWithStorage('pageScale', …)`) is shared across binders.
`EmptyPage`
(`features/EmptyPage/`) is both the stand-in for an `empty`-type page and the
page shown when the binder has no active page (`Binder` renders `<EmptyPage/>`
untitled in that case). The `empty` type is offered in the add-page menu for now
but is slated for removal from that list later.

Adding a page is driven from `TabControls` (below), which opens `AddTabModal`
(`tabs/modals/AddTabModal.tsx`) — a proper modal (not `window.prompt`) asking for a
**name** and a **type**. On submit `Binder.createPage` mints the id via
`src/lib/newId.ts`'s `newId()` (the shared GUID helper, unit-tested in
`newId.test.ts`) — an opaque id decoupled from the name so it survives renames;
that id is also the character sheet's `storagePrefix`, and the new page becomes
active.

`TabControls` (`tabs/TabControls.tsx`/`.css`) is a vertical cluster of round
`IconButton`s in the gutter right of the tab strip, plus a **Back to library**
button (calls `onExit`) pinned to the top-left viewport corner. The **Add page**
button is always shown (adding is the only way to add a page — there is no "+"
tab); the edit, delete, and **Print** buttons act on the **active** tab and
appear only when one is active (`hasActive`; Print calls `window.print()`).
Separately, `ViewControls` (a bottom-left cluster) zooms the page and tab strip
in/out, its buttons `disabled` at the min scale and the viewport-fit max. A
`@media print` block in `Binder.css` hides the tab strip and controls and zeroes
the margins so only the page content prints. Editing opens `EditTabModal.tsx` (in
`tabs/modals/`, built on the shared `Modal`): it renames the label (the
id/`storagePrefix` and stored fields are untouched) and recolours the tab `hue`
via the shared `ui/ColorPicker`, both in one dialogue; deletion opens the shared
`ui/ConfirmModal`. `Binder` owns the handlers (`createPage`, and
`editPage`/`deletePage`, which patch or drop the active page in the persisted
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
styled purely by class so a variant never loses a specificity battle), plus
`.modal__prompt` for a confirmation/prompt paragraph. Every add/edit/confirm
dialogue is built on it, supplying only its own form markup, and each shares the
name-field state and trim/guard submit via the `useNameForm` hook (`src/hooks/`).

`ColorPicker` is the shared hue picker used by the binder and tab edit modals: a
hue slider, preset swatches, and a live-preview swatch. Props are `hue`,
`onChange`, `presets` (the preset hues), and `preview` (a hue → CSS-colour
function). The preview functions come from `src/lib/hueColors.ts` (the same
functions the components use), so the binder spine's and paper tab's tones stay
distinct **and** the preview never drifts from what the component renders. Its
picker styling lives in `ColorPicker.css`.

`ConfirmModal` is the shared `Modal`-based confirmation dialog (used for deleting
binders and tabs). Props are `title`, `message`, `confirmLabel`, an optional
`variant` (`primary`/`danger`), `onConfirm`, and `onCancel`.

`IconButton` is the shared round, Material-style button: an icon at rest with a
floating text-label pill that fades in on hover/focus. Props are `icon`, `label`
(used as both the pill text and the accessible name), `onClick`, an optional
`labelSide` (`left`/`right`), `variant` (`default`/`danger`), `size`
(`default`/`large`), and `disabled`. Callers control
stacking via the surrounding container so the pill can sit above neighbours (e.g.
`Binder`'s `TabControls` gives its cluster a high `z-index`).

### Shared helpers (`src/lib`, `src/hooks`)

Framework-agnostic pure helpers live in `src/lib` (colocated `*.test.ts`):
`fieldNodes.ts` (the field-node factory), `parseNumericField.ts`
(`parseNumericField(raw)` → `number | null`, the one place raw field strings are
parsed to numbers), `tabHue.ts` (the per-index tab/binder hue), `newId.ts`
(`newId()`, the one `crypto.randomUUID()` GUID helper for both binder and page
ids), `hueColors.ts` (the hue → CSS-colour functions for the binder spine and
paper tabs — `binderSpineLight`/`binderSpineDark`/`binderSpineColor` and
`tabColor` — the **single source of truth** shared between the modal previews and
the components, which consume them as inline CSS custom properties so the colours
never drift from the CSS), and `navigation.ts` (the pure `Location` type — which
binder is open and which page is active — with
`libraryLocation`/`isLibrary`/`sameLocation`). Shared React hooks live in
`src/hooks`: `useAutoFitFontSize(ref, value, maxFontSize, axis)` (the
shrink-to-fit loop behind `AutoFitInput`/`AutoFitTextarea`, owning
`DEFAULT_FONT_SIZE`/`MIN_FONT_SIZE`), `usePageScale()` (the persisted
page-view zoom — scale, step controls, and the viewport-fit `ResizeObserver` —
consumed by `Binder`), `useNameForm(initialName, onSubmit)` (the name-field state,
mount-focus, and trim/guard submit shared by every add/edit dialogue), and
`useNavigation.ts` (the app's location, backed by the
browser History API so Back/Forward step between visited binders and pages):
`useLocation()` reads the persisted `location` atom, `useNavigate()` moves to a
location and pushes a history entry, and `useNavigationHistory()` — called once in
`App` — seeds and applies Back/Forward via `popstate`.

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

### Styling

Global tokens and utilities live in `src/index.css` on `:root`: the type/parchment
palette (`--font-serif`, `--color-parchment`/`-paper`/`-ink`/`-text`/`-border`) and
the stacking scale (`--z-page`/`-controls`/`-modal`). Component CSS references these
rather than re-hardcoding the shared font, colours, or z-index numbers. Two shared
utility classes also live there: `.corner-cluster` (a fixed vertical control stack;
callers add only the corner insets) and `.no-print` (chrome hidden under
`@media print`) — prefer them over per-file copies. Hue-derived colours are **not**
CSS literals: the components set them as inline custom properties computed by
`src/lib/hueColors.ts`, the same source the modal previews use (see above).

### File & directory naming

- **Component files:** singular PascalCase (`EditBinderModal.tsx`).
- **Component folders** (a folder named after a component it holds): singular
  PascalCase (`ui/Modal/`, `Binder/`).
- **Folders not named after a component** (groupings): plural camelCase
  (`sections/`, `logic/` — treat an established name like `logic` as its own
  plural).

### Naming: no unapproved abbreviations

Every name you introduce must be spelled out in full — function parameters,
lambda/callback parameters, local variables (`let`/`const`), type/interface
properties, and the names of components, types, classes, interfaces, functions,
files, and directories alike. **Abbreviating or using a shorthand always requires
the user's approval first**, and they will usually prefer the full word (`factory`
over `f`, `element` over `el`, `options` over `opts`, `definition` over `def`,
`index` over `i`, `centerX` over `cx`, `inputReference` over `inputRef`,
`proficiencyBonusValue` over `profBonus`). Do not introduce a new abbreviation on
your own; propose the full name, and only shorten it if the user asks. The sole
exception is any abbreviation already listed under **Common abbreviations** below
— those are pre-approved and may be used freely.

When the user does accept a particular abbreviation, add it to that list in the
same change so it stays approved going forward.

#### Common abbreviations

- `DC` — Difficulty Class (D&D 5e).
- `AC` — Armor Class (D&D 5e).
- `i` — loop counter, in `for`/`while` loop bodies only (use `index` for iterator-callback parameters).
- `config` / `Config` — configuration (e.g. `AbilityConfig`).

### General

- Add or change a field only in its `layout/sections/*` module; never duplicate a
  field id. Within a section builder, cross-field logic reads fields by reference
  off the typed tree (e.g. `abilities.wisdom.skills.perception.bonus.atom`), not by
  id lookup.
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
