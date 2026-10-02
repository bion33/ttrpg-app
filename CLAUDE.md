# CLAUDE.md

Guidance for working in this repo. Keep it current — see **Keeping this file current** at the end.

## Mandatory post-implementation review

**This section is a hard requirement. It applies to every change and cannot be
skipped, abbreviated, or deferred — not when the change is "trivial", not when
you are low on time or context, not when the user did not ask for it.** After
finishing *any* implementation work (writing or editing code, in the same
response, before you report the work as done), you **must** critically assess the
quality of the new code and report your findings to the user. There is no
exception, and there is no "looks fine" shortcut — you must actually perform each
check below and state the result, even when the result is "no concerns found".

**Scope of the review.** Assess all unstaged changes, every file they affect
indirectly through imports, and — for duplication checks specifically — the
entire codebase (duplication anywhere counts, regardless of which files you
touched).

**Checks you must perform and report on, each explicitly:**

1. **Single responsibility** — does each function, class, type, React component,
   and file have exactly one responsibility?
2. **Maintainability** — are there any maintainability concerns?
3. **Conventions** — were the conventions in this file (CLAUDE.md) followed?
4. **Duplicate code** — is there duplicated code anywhere (TypeScript, React,
   CSS, or otherwise)?
5. **Duplicated patterns** — are there duplicated patterns?
6. **Dead code / unused complexity** — is there any dead code or complexity that
   is not used?
7. **Other AI-code smells** — are there any other problems of the categories that
   frequently occur in AI-written code?

Report every concern you find — both broad architectural concerns and local code
concerns — clearly and honestly. If a check surfaces nothing, say so for that
check rather than omitting it. Do not treat completing the implementation as
finishing the task: **the task is not done until this review has been performed
and reported.**

## What this is

A TTRPG character web app. The UI is a scanned/traced character-sheet
image exported as an SVG, with interactive HTML form controls overlaid exactly
on top of the printed fields. Field values persist to `localStorage`; a few
fields (e.g. ability modifiers) are computed from others.

Stack: React 19 + TypeScript, Vite, [jotai](https://jotai.org) for state,
Vitest for tests, ESLint. Package manager: **yarn** (Yarn 4 / Berry, see
`packageManager` in `package.json`; run it via corepack, e.g. `npx corepack@latest yarn …`).

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

### Field node model (`src/type/`, `src/lib/fields/fieldNodes.ts`)

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
  - `logic/formulas/formulas.ts` — **pure** D&D 5e rules math (no atoms/React/storage),
    unit-tested in `formulas.test.ts`. Atoms wire these into derived fields.
  - `CharacterSheet.tsx` — takes a `storagePrefix` prop, memoizes
    `buildSheet(prefix)`, fetches/injects the artwork SVG, and renders the
    resulting `fields`.

### MarkdownPage feature (`src/components/features/MarkdownPage/`)

The `markdown` ("Notes") page type: a general-purpose WYSIWYG markdown editor a
user can add as many times as they like per binder — the catch-all, unstructured
tab, in contrast to the specific character sheet. Content persists as a **plain
markdown string**, riding the existing localStorage → snapshot → providers path
with no new persistence plumbing.

- `markdownAtoms.ts` — `markdownAtom(prefix)`, a cached-per-prefix
  `atomWithStorage<string>('${prefix}:markdown', '', notifyingStorage())`,
  mirroring `binderAtoms.ts`'s cached-atom pattern; `notifyingStorage`
  (`@lib/storage/observableStorage.ts`) is what makes edits count toward
  dirty-detection and the snapshot.
- `MarkdownPage.tsx` — the eager, thin page: binds the markdown atom and
  `React.lazy`-loads `MarkdownEditor` behind a `<Suspense>`, forwarding the `active` prop
  (whether it is the binder's shown page — `Binder` keeps every visited page mounted and
  hides the inactive ones). It owns **no paper chrome**
  — the editor draws its own stacked A4 sheets (see pagination below), so unlike the
  character sheet it does not wrap in `PaperPage`. Responsibility: atom binding + lazy load.
- `MarkdownEditor.tsx` — the lazy chunk (the editor is heavy, so it code-splits out
  of the main bundle): builds a [Tiptap](https://tiptap.dev) v3 editor via `useEditor`
  and renders `<EditorContent>` with the `MarkdownToolbar` and `BlockHandle`.
  Extensions: `StarterKit` (core formatting + undo/redo history, with `link` and
  `codeBlock` disabled — links are intentionally excluded), `Markdown`
  (`@tiptap/markdown`, the bidirectional markdown layer — `content`/`contentType:
  'markdown'` on load and `editor.getMarkdown()` on change), `TaskList`/`TaskItem`, the
  `tableExtensions` (see `extensions/table/` below), `Image`, the custom `Callout`, the
  custom `PageBreak`, and the `Pagination` extension (configured with an
  `onPageCountChange` setter). Tiptap reads `content` only on mount
  and reports edits via `onUpdate`; a `setContent` effect re-applies markdown that
  changes externally (e.g. a storage load). The `active` prop gates the body-portalled
  `MarkdownToolbar` and the `BlockHandle` — a hidden-but-mounted inactive editor
  (`display:none`) would otherwise leak its portalled toolbar over the active page.
  It renders the **sheet stack**: a `.md-sheets` box holding a `.md-sheet-backdrop`
  (one `.md-sheet` div per page, count from `Pagination`) behind the overlaid
  `<EditorContent>`. It also owns the insert-image dialog state, passing an `onRequestImage`
  callback to the toolbar and block handle and rendering `ImageUrlModal` (portalled to the body,
  since in place it would sit inside the zoomed `.binder-view` transform; it inserts at the
  editor's current selection on confirm). Responsibility: editor configuration + sheet-stack
  composition + image-dialog hosting.
  Images are by URL/paste only for
  now — real upload needs a later storage decision (base64 bloats the snapshot).
- `ImageUrlModal.tsx` / `ImageUrlForm.tsx` — the insert-image dialogue (shared `Modal` +
  body-only form, mirroring `AddTabModal`/`AddTabForm`): a single URL field validated with
  `@lib/url/httpUrl.ts`'s `isHttpUrl` (http(s) only), its Insert button disabled until the URL is
  valid. Replaces the old `window.prompt`.
- `MarkdownToolbar.tsx` — the formatting toolbar, all `lucide-react` icons: undo/redo, the
  Headings dropdown, inline marks (bold/italic/underline/strikethrough), the Blocks and Lists
  dropdowns (one `ToolbarDropdown` per non-insert `BLOCK_GROUPS` entry), then the standalone
  `INSERT_ACTIONS` buttons (table, image, divider, page break). Active/enabled state comes from
  `useEditorState`. Responsibility: toolbar layout.
- `ToolbarDropdown.tsx` — one toolbar dropdown grouping a block group's actions; its
  trigger shows the active action's icon (else the group icon) and its menu runs the
  chosen action (each item an icon + label). Built on **Radix `DropdownMenu`** (`@radix-ui/react-dropdown-menu`) for
  keyboard navigation, ARIA menu roles, focus management, and zoom-aware positioning (its
  `strategy: 'fixed'` popper is portalled to the body, so it is unaffected by the page
  zoom — see the block handle note below for the same concern). Responsibility: the dropdown.
- `BlockHandle.tsx` — the Nextcloud-style per-block hover affordance, wrapping
  `@tiptap/extension-drag-handle-react`'s `<DragHandle>`: a drag grip to reorder blocks
  plus a "+" button opening a menu (dismissed via `useDismissOnOutside`) that inserts any
  block. It passes floating-ui `{placement: 'left', strategy: 'fixed'}`: `left` centres
  the handle on the block, and `fixed` anchors it to the zoomed `.binder-view` (its
  containing block) — the only case floating-ui compensates page zoom for, so the handle
  stays aligned at any scale and anywhere down the page (`absolute` drifts with distance
  under zoom). Responsibility: the block handle.
- `extensions/table/` — the Nextcloud-style table editing affordances, added as React **node views**
  over `@tiptap/extension-table`'s nodes (the schemas are untouched, so tables still round-trip as
  plain markdown via the `Markdown` extension; cell merge/split are deliberately unsupported since
  plain markdown cannot represent them). `tableExtensions.ts` exports the extension array the editor
  uses in place of `TableKit`: `Table` and both cell nodes (`TableHeader`/`TableCell`) `.extend`ed
  with a `ReactNodeViewRenderer`, plus the unchanged `TableRow`. The menus live on the **cells**, not
  on a row node view: a row node view is impossible to render as valid HTML (its host `<tr>` can only
  contain `<td>`/`<th>`, never the wrapper the React renderer inserts), so the per-row menu is hosted
  by each row's last cell instead. The cell renderers pass `{as: 'th'}`/`{as: 'td'}` so the host is
  the real cell element and the table markup stays valid.
  - `TableNodeView.tsx` — wraps the table in a positioned container with a bottom-edge "add row"
    button and a right-edge control column (outside the table, in the page margin) holding the
    whole-table "…" menu (delete table) above an "add column" button, revealed on table hover. The
    body is a real `<tbody>` (`NodeViewContent as="tbody"`) holding ProseMirror's rows.
  - `TableCellNodeView.tsx` — the one node view for both header and data cells (`node.type.name`
    distinguishes them). It renders a per-column "…" menu on every header cell, and — on each **data**
    row's **last** cell (`isLastCellInRow`) — the row's insert/delete-row "…" menu. Both menus are
    absolutely overlaid on the cell, shown on hover. (The whole-table delete menu lives on the table
    node view, not the header row.)
  - `TableActionMenu.tsx` — the shared "…" dropdown (Radix `DropdownMenu`, portalled/fixed so it is
    zoom-safe) the column and row menus use.
  - `tableActions.ts` — the `TableAction` type and the `columnActions`/`rowActions`/
    `deleteTableActions` builders (each `{id, label, icon, destructive, run}`), each placing the
    caret in the right cell before running the command.
  - `tablePositions.ts` — the **pure, unit-tested** (`tablePositions.test.ts`) caret-position math:
    `isHeaderRow`, `firstCellInnerPosition`, `isLastCellInRow` (which cell carries the row menu), and
    `lastRowCellPosition`/`lastColumnCellPosition` (the append-at-end targets for the edge buttons).
- `blocks/insertBlocks.ts` — `BLOCK_ACTIONS`, the **single source of truth** for the
  block types a user can apply/insert (headings 1–6, text/paragraph, quote, the four
  callout variants, the three list kinds, table, image, divider, page break): each is `{id, label,
  icon, group, isActive(editor)}` plus either a `run(editor)` that applies immediately **or** a
  `dialog` marker (currently only `'image'`) for an action that must gather input from a dialog first
  (`icon` a `lucide-react` component). `runBlockAction(action, editor, handlers)` is the shared
  dispatcher both consumers call — it opens the action's dialog (via a `handlers` callback) or runs
  it — so the dialog-vs-run branch lives in one place. Two
  projections derive from it: `BLOCK_GROUPS` buckets the dropdown groups — `heading`
  (Headings), `block` (Blocks: text, quote, callouts), `list` (Lists) — each with a
  default trigger label/icon; `INSERT_ACTIONS` is the flat `insert` group (table, image,
  divider, page break), rendered as standalone toolbar buttons rather than a dropdown. The block handle's
  "+" menu renders the flat `BLOCK_ACTIONS`, so toolbar and handle never drift.
- `extensions/callout.ts` — the custom `Callout` Tiptap `Node` (info/success/warning/
  danger), which round-trips as a Pandoc fenced directive (`:::callout {type=info} …
  :::`) via `createBlockMarkdownSpec` from `@tiptap/core`.
- `extensions/pageBreak.ts` — the custom `PageBreak` Tiptap `Node`: an atomic block
  (a thin `.md-page-break` rule) that forces the following content onto a new sheet,
  round-tripping as a self-closing Pandoc directive (`:::pagebreak`) via
  `createAtomBlockMarkdownSpec`. Adds a `setPageBreak` command; registered in
  `BLOCK_ACTIONS` as an insert action, so it reaches the toolbar and block-handle menu.
- `extensions/pagination/pagination.ts` — the **custom pagination** extension (a
  full custom implementation; the earlier `tiptap-pagination-plus` attempt was dropped).
  A single ProseMirror editor flows across the stacked sheets: on each view update (rAF-
  debounced) and `ResizeObserver` reflow it measures each top-level block's border-box height
  and vertical margins (kept apart so the break math can collapse adjacent margins), reads
  the live sheet geometry from the rendered backdrop + the editor column's own margins
  (so CSS stays the single source of dimensions), computes breaks via the pure
  `logic/pagination/` math, and applies them as decorations — a spacer **widget** filling
  the rest of a sheet before each breaking block, plus a `md-break-before` node class for
  the print path. It reports the sheet count through `onPageCountChange`. A decoration
  signature guards against re-dispatch loops; measurement uses `offset*` metrics, so the
  binder zoom (a `transform`) needs no recompute. A single block taller than one sheet
  cannot be split and overflows its sheet (documented limitation).
- `logic/pagination/pagination.ts` — the **pure, unit-tested** (`pagination.test.ts`)
  break math: `computeBreaks(blocks, {contentCapacity, interSheetSkip})` decides where the
  flow breaks (a manual-break block forces the next block to a new sheet; otherwise a
  block breaks when its border box would overflow the current sheet) and the spacer height
  each break needs. It **collapses adjacent block margins** the way CSS flow does (the gap
  above a block is its top margin maxed against the previous block's bottom margin, not the
  sum), so the used height — and every spacer — never drifts as the document grows;
  `pageCount(breaks)` is the sheet count (always ≥ 1). No DOM/atoms/React.
- `MarkdownPage.css` — themes the ProseMirror surface, toolbar, block handle, and
  callouts to the parchment/serif tokens; styles the **sheet stack** (`.md-sheets`,
  `.md-sheet-backdrop`, `.md-sheet` — each a bordered A4 sheet in the active-hue, stacked
  with `--md-sheet-gap`; the editor column overlays them with the shared `--md-sheet-pad-*`
  A4 margins). The stack is a **fixed physical A4 footprint** — `.md-sheets` is `--md-sheet-width`
  wide and centred, so the on-screen sheet matches the printed page
  exactly (same characters per line, same lines per page): the editor is true WYSIWYG and the
  break math measures the same geometry print uses. `--md-sheet-width` is **set inline from JS**
  (`MarkdownEditor.tsx`, `${A4_WIDTH_PX}px` from `@lib/paper/paperSize.ts`) rather than a CSS `210mm`
  literal, so the sheet width and the zoom math (which also scales by that constant) share one source
  and cannot drift; `MarkdownPage` exposes that width as `MarkdownPage.naturalWidth` for the zoom.
  The binder's zoom transform scales the page up
  for reading without changing that layout (every page's `.binder-view` shrink-wraps its fixed-width
  sheet so the tab strip stays flush with the sheet's right edge). Its `@media print` block maps each sheet to a real printed page via CSS
  fragmentation (hides the backdrop/spacers, un-pins the overlay, and `break-before: page`
  on `.md-break-before`), printing under the binder's default `@page { margin: 0 }` so the
  `210mm` sheet fills the page width unscaled — the top/side gaps come from the editor column's
  own padding instead. Since that padding margins only the first printed page, each
  `.md-break-before` block also carries a `padding-top: var(--md-sheet-pad-y)` to reproduce the
  top margin on every later page (padding, unlike a margin, is not truncated at a forced break);
  each page's bottom gap emerges from the breaks reserving the on-screen content height. The
  toolbar and handle carry `.no-print`, so `index.css`'s print
  rule hides them.

The toolbar/handle cover Nextcloud's editor as far as Tiptap allows; Nextcloud's math,
collapsible details, and word-count/help are omitted. `@tiptap/extension-drag-handle`
statically imports two Yjs collaboration modules (`@tiptap/extension-collaboration`,
`@tiptap/y-tiptap`) it only uses under live collaboration; since this app has none, both
are aliased to tiny stubs in `src/shims/` (wired in `vite.config.ts`) to keep the Yjs
stack out of the bundle.

### Library feature (`src/App.tsx`, `src/components/features/Library/`)

`App` is the root: it holds the jotai store in state and renders the app inside a
jotai `<Provider store={store}>`, exposing a `remount()` (a fresh `createStore()`)
through `StorageRemountContext` so a storage **load** can swap the store and make
every `atomWithStorage` atom re-read the bulk-rewritten `localStorage` (see the
Storage feature below); `AppContent` inside the provider wires navigation and
renders `Library`. The **library**
holds many **binders**: a `LibraryBinderItem` is serialisable metadata (`id`,
`label`, `hue`), where `id` is a `crypto.randomUUID()` GUID (minted by
`src/lib/ids/newId.ts`'s `newId()`, unit-tested in `newId.test.ts`, shared with the
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
reads no `localStorage` itself, and `logic/binderTabs/binderTabs.ts`'s `binderTabs` (pure,
unit-tested in `binderTabs.test.ts`) projects the persisted page list to each tab's
label and hue. The stable per-sheet paper
offset/rotation comes from `logic/bookJitter/bookJitter.ts` (pure, seeded off the binder id,
unit-tested in `bookJitter.test.ts`), so a book's mess is consistent across
renders. When a binder is open the grid gives way to
the `Binder` bound to that binder's id (`<Binder storagePrefix={id} onExit=…/>`,
keyed by id so it remounts per binder). Adding/editing/deleting a binder go
through the `Modal`-based modals in `modals/`, one component per file
(`AddBinderModal.tsx` takes a name **and an optional "Create from" binder template**;
`EditBinderModal.tsx` renames + recolours the spine via the shared `ui/ColorPicker`);
deleting reuses the shared `ui/ConfirmModal`, warning all the binder's pages are
removed. `Library.createBinder(name, fromTemplateId?)` adds the binder and, when a
template is chosen, instantiates its structure via `instantiateBinderTemplate`
(Templates feature) — writing `pagesAtom`/`activePageAtom` and seeding any markdown
content — before the shelf refreshes. Default spine hues reuse the shared
`src/lib/colors/tabHue.ts`. Adding is driven by a **ghost binder** —
the same `LibraryBinder` markup faded to a low opacity (`.library__binder--ghost`, the
`ghost` variant), with a plus icon in the portrait in place of a letter and the
name "Add binder". It sits in the grid's last cell after the existing covers and
opens `AddBinderModal`; there is no separate corner button, and an empty library
shows just the ghost cover. A bottom-right `corner-cluster` of two `IconButton`s
(`library__templates`) opens the **Page templates** and **Binder templates** managers
(Templates feature).

### Binder feature (`src/components/features/Binder/`)

`Binder` (`Binder.tsx`) is rendered per-open-binder by `Library` and takes a
`storagePrefix` (the binder's id) and an `onExit` callback (back to the grid).
It owns the whole page area: it renders each page the user has **visited since the
binder opened**, each in its own `.page` wrapper (`Binder.css`, which only carries the
drop shadow/border and reserves room for the tabs — the page content styles itself; a
markdown page gets the `.page--bare` modifier, which drops the wrapper's border/shadow
since each of its A4 sheets draws its own. `.binder-view` shrink-wraps its page (every
page type renders at a fixed physical-sheet width) so the tab strip stays flush with the
sheet). Only the active page is shown; the others are `hidden` (`display:none`) but stay
**mounted**, so switching between this binder's tabs is instant rather than rebuilding a
heavy editor each time — a visited-ids set grown during render (cleared when leaving the
binder remounts it). An empty binder (no active page) shows the untitled empty page.
These sit beside the `Tabs` strip
(`tabs/Tabs.tsx`/`tabs/Tabs.css`), both inside a full-width `.app-shell`. The
tab-strip components live together in a `tabs/` subfolder (`Tabs`,
`TabControls`), with the tab modals in a nested `tabs/modals/` (`AddTabModal`,
`EditTabModal`); they are feature-specific, so they live in the feature folder,
not in `ui/` (tab deletion reuses the shared `ui/ConfirmModal`). The pure
per-index tab-hue function lives in `src/lib/colors/tabHue.ts` (shared by `Binder` and
`Library`, unit-tested in `tabHue.test.ts`). Page-view zoom lives in the shared
**`PageViewport`** (see its feature below), which `Binder` wraps its pages and
`Tabs` in, passing the active page's natural width (resolved by
`pageNaturalWidth(type)`, which reads each page component's own `naturalWidth`).

The page list is **dynamic and persisted**: a `Page` is serialisable tab
metadata (`id`, `label`, `type`, `storagePrefix`), declared with the per-binder
atoms in `binderAtoms.ts`, and `renderPage(page, storagePrefix, active)` (in `Binder.tsx`)
resolves it to an element by `type` — `characterSheet` → `CharacterSheet` bound to
the **binder-prefixed** storage prefix (`pagePrefix(storagePrefix, page.storagePrefix)`,
the one `binderAtoms.ts` helper for the `${binderPrefix}:${pageId}` join every page-
seeding site shares),
`markdown` → a `MarkdownPage` bound to the same binder-prefixed prefix (passed `active`,
whether it is the shown page, so a hidden-but-mounted notes tab suppresses its
body-portalled toolbar/handle; each notes tab keeps its own persistent editor rather than
one editor remounted per prefix), `empty` → an `EmptyPage` titled by its label. Page
types live in `pageTypes.ts` (`PageType`, `PAGE_TYPES`). The page list is a **per-binder** atom from
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
entry. The zoom is stored as a **viewport-width fraction**
(`usePageScale`'s `atomWithStorage('pageWidthFraction', …)`) shared across binders:
the page occupies that fraction of the viewport regardless of its natural width, so
zoom feels uniform across page types and syncs identically across devices. The hook
derives the `scale` (`fraction × viewportWidth / naturalWidthPx`) and clamps the
fraction to a fit ceiling measured from the scaled wrapper's layout width (the page
plus its tab-strip/margin chrome), so it never overflows the viewport.
`EmptyPage`
(`features/EmptyPage/`) is both the stand-in for an `empty`-type page and the
page shown when the binder has no active page (`Binder` renders `<EmptyPage/>`
untitled in that case). The `empty` type is default-only — it is not offered in
the add-page menu (`PAGE_TYPES`), only used as the stand-in described above.

Adding a page is driven from `TabControls` (below), which opens `AddTabModal`
(`tabs/modals/AddTabModal.tsx`) — a proper modal (not `window.prompt`) asking for a
**name** and a **type**, and (when the type is `markdown`) an optional **Template**
(Blank + the markdown templates; see the Templates feature). `AddTabModal` is just
`Modal` + `AddTabForm` (`tabs/modals/AddTabForm.tsx`, the body-only form) — and likewise
`EditTabModal` is `Modal` + `EditTabForm` (`tabs/modals/EditTabForm.tsx`) — split so a
dialogue swapping its body in place (the binder-template tab editor) can show the
add/edit form without nesting a second `Modal`. On submit
`Binder.createPage(name, type, markdownTemplateId?)` mints the id via
`src/lib/ids/newId.ts`'s `newId()` (the shared GUID helper, unit-tested in
`newId.test.ts`) — an opaque id decoupled from the name so it survives renames;
that id is also the page's `storagePrefix`, and the new page becomes active. A
markdown page created from a template seeds its content via
`seedMarkdownContent` (Templates feature) from that template's live body.

`TabControls` (`tabs/TabControls.tsx`/`.css`) is a vertical cluster of round
`IconButton`s in the gutter right of the tab strip, plus a **Back to library**
button (calls `onExit`) pinned to the top-left viewport corner. The **Add page**
button is always shown (adding is the only way to add a page — there is no "+"
tab); the edit, delete, and **Print** buttons act on the **active** tab and
appear only when one is active (`hasActive`; Print calls `window.print()`).
Zoom is handled by the shared `PageViewport` (its `ViewControls`, a bottom-left
cluster); see that feature below. A `@media print` block in `Binder.css` hides the
tab strip and controls and zeroes the margins so only the page content prints. Editing opens `EditTabModal.tsx` (in
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

### PageViewport feature (`src/components/features/PageViewport/`)

`PageViewport` (`PageViewport.tsx` + `.css`) is the **shared page-view zoom
scaffold** extracted from `Binder` so every page surface zooms identically. Props:
`naturalWidth` and `children`. It owns the `.binder-view` wrapper (scaled to a
persisted fraction of the viewport via `usePageScale(naturalWidth)`), the transient
`binder-view--zooming` compositor-layer promotion (`will-change: transform` toggled
as a class on the DOM node for the ~0.3s of a scale change only — a permanent layer
around the editable markdown surface blanks out after inactivity), and the bottom-left
`ViewControls` cluster (`ViewControls.tsx` + `.css`, moved here from `Binder`). The
`.binder-view*` CSS (including its `@media print` transform reset) lives in
`PageViewport.css`. `Binder` wraps its pages + `Tabs` in it; the markdown-template
editor (Templates feature) wraps its `MarkdownPage` in it. The caller keeps the
`.app-shell` wrapper and sets `--sheet-border-color`.

### Templates feature (`src/components/features/Templates/`)

**Library-wide reusable templates**, riding the existing localStorage → snapshot →
sync path (every atom uses `notifyingStorage()`, so no new persistence plumbing).
Two kinds:

- **Markdown (page) templates** — reusable note layouts picked when adding a Notes
  page.
- **Binder templates** — a reusable **structure only** (ordered tabs: type, label,
  hue, and for a markdown tab a *reference* to a markdown template), chosen when
  adding a binder. The markdown reference is resolved to a concrete content copy only
  at binder-creation time, so the template stays live-linked (editing it later affects
  only binders created afterward).

- `templateTypes.ts` (pure) — `MarkdownTemplate = {id, label}` (its body lives
  separately); `BinderTemplatePage = {id, label, type, hue, markdownTemplateId?}`;
  `BinderTemplate = {id, label, pages}`.
- `templateAtoms.ts` — `markdownTemplatesAtom` (`'markdownTemplates'`) and
  `binderTemplatesAtom` (`'binderTemplates'`), both `atomWithStorage(…, [],
  notifyingStorage())`. `templateContentPrefix(id)` = `` `template:${id}` `` — a
  markdown template's body reuses **`markdownAtom(templateContentPrefix(id))`** (key
  `template:<id>:markdown`), so it serialises like any notes page (no new content
  store). `seedMarkdownContent(store, destinationPrefix, markdownTemplateId)` copies a
  template's live body into a destination page's markdown (shared by both creation
  paths); `clearMarkdownTemplateContent(store, id)` blanks a deleted template's body.
- `logic/instantiate/instantiate.ts` (+ test, **pure**) —
  `instantiateBinderTemplate(template, makeId)` → `{pages, seeds}`: concrete `Page[]`
  (ids from the injected `makeId`, `storagePrefix === id`, order/label/type/hue
  preserved) plus the markdown `seeds` to copy. Deterministic; no atoms/DOM/store.
- `TemplateEditor.tsx` (+ `.css`) — the markdown-template **editor surface** (a
  navigable location, not a binder): an `.app-shell` around
  `<PageViewport naturalWidth={MarkdownPage.naturalWidth}>` wrapping
  `<MarkdownPage storagePrefix={templateContentPrefix(id)} active/>`, plus
  `StorageControls` and a top-left Back-to-library `IconButton`. No tab strip / tab
  controls. `AppContent` renders it when `isMarkdownTemplate(location)`.
  Both managers hold a single `Modal` whose **body swaps in place** by a `view` state
  (list / add / rename / delete, plus `edit` for binder templates) rather than stacking
  a dialogue on a dialogue — so add/rename/delete render `NameForm`/`ConfirmBody`
  bodies inside the one modal, their Cancel/submit/confirm returning to the list.
- `MarkdownTemplatesModal.tsx` — the page-templates manager: a `ManagerList` of
  `markdownTemplatesAtom` with add/rename (`NameForm`), delete (`ConfirmBody`, also
  `clearMarkdownTemplateContent`), and **Edit** → `navigate(markdownTemplateLocation(id))`.
- `BinderTemplatesModal.tsx` — the binder-templates manager: a list view (`ManagerList`
  of `binderTemplatesAtom`, add/rename/delete) whose **Edit** swaps to
  `BinderTemplatePagesEditor` for that template.
- `BinderTemplatePagesEditor.tsx` — the **lighter plain tab list** for one binder
  template's `pages` (not the rotated `Tabs` strip), each row tinted to its tab hue via
  `tabColor`/`tabBorderColor`: reorder, edit (label + hue), delete, and add. It **owns its
  own `Modal`** (title + a top back link to the templates list), and **add/edit/delete each
  swap that dialog body in place** — to `AddTabForm`, `EditTabForm`, and `ConfirmBody`
  respectively, their own Cancel/submit/confirm buttons returning to the tab list — rather
  than stacking a second modal. The add-tab form still returns the markdown-template id;
  re-pointing a markdown tab's template = delete + re-add.
  New-tab hue = `tabHue(pages.length)`.
- `ManagerList.tsx` + `NameForm.tsx` + `Templates.css` — the shared list body
  (rename/open/delete rows, sorted by `compareByLabel`, + add button) and the shared
  single-field add/rename **body** (no `Modal` of its own), so the two managers stay
  uniform rather than duplicating structure.

Applied at creation: `Binder.createPage` seeds a new Notes page from a chosen
markdown template; `Library.createBinder(name, fromTemplateId?)` instantiates a chosen
binder template — `store.set(pagesAtom(id), pages)`, `seedMarkdownContent` per seed,
`store.set(activePageAtom(id), pages[0]?.id ?? '')` (same store, no remount). A
since-deleted markdown reference yields an empty Notes page (graceful).

### Storage feature (`src/components/features/Storage/`, `src/lib/storage/`, `src/hooks/useStorage.ts`)

Durable, whole-library persistence beyond `localStorage`. Persistence is **not**
per-field: the entire `localStorage` key space is snapshotted to one JSON document
and hydrated back, so the sync layer is fully decoupled from the field-node system.
Phase 1 ships the pure core plus the **file provider** only (export/import); cloud
providers land in later phases behind the same seams.

The `src/lib/storage/` group is itself organised by concern: `providers/` (the
provider registry, types, per-provider implementations, and their shared
`httpError`), `oauth/` (the shared OAuth/token machinery — `oauthClient`,
`oauthTokenClient`, `pkce`), `sync/` (`sync`, `syncActions`), plus `snapshot`,
`connectionStore`, and `observableStorage` at the group root.

- **Snapshot (`src/lib/storage/snapshot.ts`).** `LibrarySnapshot` (`version`,
  `revision` GUID, `savedAt`, and `entries`: every `localStorage` key → value) with
  `createSnapshot`/`applySnapshot` (replace, not merge; migrates then clears then
  writes) over an injected `StorageLike`, and `snapshotHash` (a **`hash-sum`** of the
  key-sorted entries, used for dirty detection and conflict lineage). Colocated-tested.
- **Migrations (`src/migrations/`).** `migrations.ts` is the engine — the `Migration`
  type, the append-only `MIGRATIONS` list, `CURRENT_VERSION` (derived from the highest
  `to`), `runMigrations(entries, fromVersion, migrations)`, and `migrateSnapshot`
  (rejects a snapshot newer than this app). **Each migration is its own file** in this
  directory (`v2.ts`, …), listed in `MIGRATIONS` in ascending `to` order; append new
  ones, never edit or renumber an existing one. `v2` is currently a live no-op
  (identity) migration documenting the shape. Version numbers are meaningless except to
  trigger migrations. Each file is colocated-tested (`migrations.test.ts`, `v2.test.ts`).
- **`src/lib/storage/` group.** `sync.ts` — the pure `evaluateSync({remoteRevision,
  baseRevision, dirty})` → `SyncStatus` conflict decision (revision lineage, not
  clocks; full truth-table tested). `StorageProvider.ts` — the `ProviderId`,
  `StorageTarget`, and `StorageProvider` types (phase 1 needs only
  `connect`/`isConnected`/`save`/`load`/`readRevision`). `fileProvider.ts` — the
  `file` provider: pure `serialiseSnapshot`/`parseSnapshot` (validated, tested) plus
  thin File System Access API / anchor-download / hidden-input glue; `readRevision`
  returns `null` (a file can't be probed). `nextcloudProvider.ts` — the `nextcloud`
  provider (phase 3): pure `webdavUrl`/`webdavParentUrls` URL builders plus
  save/load/readRevision/connect that relay one WebDAV request each through the
  same-origin `/api/nextcloud` (Basic auth built client-side); `connect` PROPFINDs the
  base then recursively `MKCOL`s the target's parent folders, `readRevision` GETs and
  returns the in-file `revision` (a file is sheet-sized, so a full fetch is fine). It
  holds the active `NextcloudConnection` in a module variable set via `adoptConnection`;
  persistence is the caller's (see `connectionStore`). `onedriveProvider.ts` — the
  `onedrive` provider (phase 4): a pure `contentUrl(fileName)` builder for the
  Graph app-folder file (`me/drive/special/approot:/<fileName>:/content`, the filename
  owned by `target.locator`) plus save/load/readRevision/connect against Microsoft Graph.
  It holds the active
  `OneDriveConnection` (a rotated refresh token + generic label) and a short-lived
  in-memory access token — both held by the shared `oauthTokenClient.ts` (see below), whose
  `withAccessToken` refreshes via `/api/oauth/microsoft/refresh`
  (and retries once on a Graph 401), and — since Microsoft rotates the refresh token on
  every refresh — `adoptConnection(connection, onChange?)` takes an **optional change
  callback** so the caller persists the rotated token without the provider importing
  `connectionStore`. `readRevision` returns the **in-file** `revision` GUID (not Graph's
  eTag/cTag), 404→null. `googleDriveProvider.ts` — the `googleDrive` provider (phase 5):
  save/load/readRevision/connect against the Drive v3 REST API in the app's own hidden
  **app-data folder** (`spaces=appDataFolder`, the least-privilege `drive.appdata` scope).
  Drive addresses files by **id**, so the provider stores the file id in the connection
  (`GoogleDriveConnection.fileId`) and resolves it **at most once** via `ensureFileId` —
  the stored id (no request), else a single name lookup, creating the file (multipart) when
  absent — persisting the discovered/created id through the same `adoptConnection(…, onChange?)`
  rotation seam OneDrive uses. `save` PATCHes the media by id (recreating once on a 404 from an
  external delete); `readRevision` returns the **in-file** `revision` GUID. Google does not
  rotate its refresh token, so the rotation guard is a harmless no-op. `oauthTokenClient.ts` —
  `createOAuthTokenClient(config)`, the **shared** connection/access-token machinery both OAuth
  providers build on (active connection + rotation callback, cached access token, relay refresh,
  and the 401-retry `withAccessToken`); each provider makes one instance bound to its relay
  refresh endpoint and messages, and layers only its own REST calls on top (so `adoptConnection`
  is that instance's `adopt`). It is covered through both provider test suites. `httpError.ts` —
  `describeHttpFailure(response, lead)`, the shared failure-message builder every cloud provider
  throws through: a provider-specific `lead(status)` (with any credential/permission hint)
  followed by the server's own response text (whitespace-collapsed, length-capped) so a failure
  is diagnosable rather than an opaque status code (colocated-tested). `pkce.ts` — pure
  PKCE/OAuth helpers
  (`createCodeVerifier`/`createState`/`codeChallenge`/`base64UrlEncode` and the
  generic `authorizeUrl` builder — an authorize endpoint plus provider-specific
  `extraParams`, serving Microsoft **and** Google), tested against the RFC 7636
  known-answer vector.
  `oauthClient.ts` — side-effectful browser glue (untested, like `fileProvider`'s
  picker), **generic over provider**: `runOAuth(config)` opens the sign-in popup
  (synchronously, to keep the user gesture) and awaits the code the static per-provider
  callback page (`public/oauth/microsoft/callback.html`, `public/oauth/google/callback.html`)
  `postMessage`s back (state + origin + message source validated); `runMicrosoftAuth`/
  `runGoogleAuth` are thin config builders over it, and `exchangeCode(provider, …)` posts to
  the relay, surfacing the relay's own error detail on failure (unwrapping the token endpoint's
  `error_description`, or naming a missing server OAuth config on a 500/404) so a failed sign-in
  is diagnosable. `providers.ts` — the provider registry
  (`getProvider`/`isProviderAvailable`) now registers `{file, nextcloud, onedrive, googleDrive}`,
  so Google Drive stops showing as "coming soon". `syncActions.ts` — the **pure**
  provider-dependent decisions (`isProbeable`, `resolveTarget`, `chooseRemoteRevision`,
  `canSave`/`canLoad`, `saveIntent`, and the phase-6 `autosaveIntent`/`autoloadIntent`),
  unit-tested over every `(status, probeable, …)` combination so the hook and the controls
  can never disagree about enablement, the save guard, or when autosave/autoload fire.
  `autosaveIntent` yields `write`/`conflict`/`idle` and `autoloadIntent` yields
  `load`/`conflict`/`idle`; both are cloud-only (idle for the non-probeable file provider),
  never act while disabled, and route a `diverged` status to the conflict flow rather than
  clobbering. `resolveTarget(provider, connections)` takes a `CloudConnections` bag
  (`{nextcloud, oneDrive, googleDrive}`) — additive as providers are added, not a per-provider
  parameter — and owns the fixed snapshot filename (`SNAPSHOT_FILENAME = 'ttrpg-app.json'`),
  passed to both cloud providers as `target.locator`. `connectionStore.ts` — device-local
  `SyncState` (`baseRevision`/`baseHash`),
  the active provider id, the `NextcloudConnection`
  (`load`/`save`/`clearNextcloudConnection`), the `OneDriveConnection`
  (`load`/`save`/`clearOneDriveConnection`), and the `GoogleDriveConnection`
  (`load`/`save`/`clearGoogleDriveConnection`, storing the resolved `fileId`), and the
  device-local **autosave preference** (`load`/`saveAutosaveEnabled`, default true — one global
  toggle governing both autosave and autoload, not synced since it is per device) in
  **IndexedDB** (via **`idb-keyval`**), kept out of the snapshot. `observableStorage.ts` — `notifyingStorage<Value>()`, the
  jotai `atomWithStorage` storage **every persisted atom uses** (field nodes, binders,
  pages, active page, location, page scale): it is the default JSON localStorage storage
  plus a write notification, and `subscribeToStorageWrites` lets the hook recompute
  `dirty` the moment any edit persists — not only on window focus.
- **`useStorage()` hook.** Orchestration for the controls: resolves the active target
  per provider via `resolveTarget`, derives `dirty`
  (`baseHash === null ? libraryHasData() : snapshotHash(current) !== baseHash`,
  recomputed immediately on window focus and — **debounced** (`use-debounce`'s
  `useDebouncedCallback`, so a burst of edits hashes once) — on persisted-atom writes
  via `subscribeToStorageWrites`) and `status`, and drives `save` (mint revision → `provider.save` → persist `SyncState`;
  a probeable remote that is ahead/diverged routes through the conflict flow via
  `saveIntent`), `load` (`provider.load` → `evaluateSync` → apply, or raise the conflict
  flow on `diverged`/`localAhead`), and `resolveConflict`. For a **probeable** provider
  (every one but `file`) it probes the remote revision through `readRevision` — on
  mount, on `window` focus, and after each save/load — feeding the real value (not the
  base) into `evaluateSync`, with a request-token stale guard so an out-of-order probe
  never regresses the revision; `file` keeps the base as its stand-in remote. **A single
  instance is held above the library/binder switch** (see `StorageProvider` below), so it
  is not remounted — and the remote re-probed — on every navigation between the two. Switching
  provider or (dis)connecting a cloud provider resets the sync base (a base from another
  target is meaningless). Exposes `connectNextcloud`/`disconnectNextcloud` +
  `nextcloudConnection`, `connectOneDrive`/`disconnectOneDrive` + `oneDriveConnection`,
  and `connectGoogleDrive`/`disconnectGoogleDrive` + `googleDriveConnection`
  (each `connect*` runs its OAuth flow via `exchangeCode(provider, …)`, then builds a
  generic-labelled connection). It also exposes a **`saving`** flag — set for the whole
  `save()` (the conflict-probe branch and the write) so the controls can disable Save while
  a save runs, which prevents two overlapping saves from letting the id-addressed Google
  provider create a duplicate app-data file; it is the one deliberate exception to "the hook
  exposes no activity/error state" (toasts otherwise), gating the button rather than reporting
  progress. The
  near-identical cloud connect/disconnect/mount-hydrate lifecycle lives **once** in
  `useCloudConnection(ports, actions)` (`src/hooks/`): adopt → validate → persist →
  activate → reset base, and the inverse on disconnect; all three cloud providers route
  through it, differing only in building their `Connection` (Nextcloud's form fields vs
  the OAuth providers' code exchange) and in exposing their typed connection state. Its `adopt`
  call passes the provider's own `persist` port as the rotation `onChange`, so a rotated
  OneDrive refresh token (or a resolved Google file id) is saved through the one persister
  (Nextcloud ignores the extra argument). After applying a load it calls the `StorageRemountContext`
  `remount()` so atoms re-read storage. Exports that context.
  **Autosave/autoload (phase 6).** For a cloud provider with the device-local autosave preference
  on, the hook saves and catches up **hands-off**: a persisted-atom write schedules a longer
  (`AUTOSAVE_DEBOUNCE_MS = 2000`) debounce that runs `autosaveIntent` and, on `write`, saves through
  the same `save()` path (so a `diverged` remote still routes to the conflict modal, never a silent
  overwrite); the remote probe path (`refreshRemote`, on mount/focus/post-save/post-load) runs
  `autoloadIntent` and catches a cleanly-ahead remote up through `load()`, guarded by an
  `autoloadInFlight` ref against overlap. `performSave` guards re-entrancy with a `savingRef` so a
  debounced autosave and a manual save can never both write. **Durability** — every edit is written
  to `localStorage` synchronously, so only the *remote* copy can ever lag one debounce window; the
  small **`useAutosaveFlush`** hook (`src/hooks/`) closes that window by flushing the pending
  autosave on `visibilitychange`→hidden and window `blur` (both page-alive, a normal uncapped fetch),
  and on `beforeunload` (when there is unsaved work) it dispatches the save and shows the native
  confirmation prompt, whose dwell time lets the already-issued request land. No service worker / no
  `keepalive`; a service-worker Background Sync is the future path for completing an upload after the
  page is truly gone. The hook also exposes `autosaveEnabled`/`setAutosaveEnabled` (persisted
  device-local) and a one-shot `promptSettings`/`dismissSettingsPrompt` — set once after mount when
  no provider was ever configured, so a first-time user is shown storage settings.
- **UI (`features/Storage/`).** `StorageProvider` (mounted once in `AppContent`, above the
  library/binder switch) holds the single `useStorage()` instance and exposes it through
  `storageContext.ts`'s `StorageContext`/`useStorageContext()`, so navigation does not
  remount the orchestration (re-probing the cloud remote each crossing). `StorageControls`
  — a `corner-cluster` of
  `IconButton`s (Settings, Load, Save) with a `placement` prop (`binder` → top-left
  under "Back to library"; `library` → top-left), mounted by `Binder` and
  `Library` (both reading the shared instance via `useStorageContext()`); Save/Load enablement and labels come from the pure `canSave`/`canLoad`
  (file export/import is always enabled; a cloud provider gates **Save on local
  `dirty`ness alone** — decoupled from the remote probe, since `save` re-checks the
  remote and routes a conflict at click time — and **Load on `status`**).
  Save/load progress and failures surface as **toasts** — `useStorage` calls
  [`sonner`](https://sonner.emilkowal.ski)'s `toast` directly (a `toast.loading`
  updated in place to `toast.success`/`toast.error`), rendered by the single
  top-left `<Toaster/>` mounted once in `App`; the hook exposes no activity/error state.
  Save is additionally disabled while `saving` is true. `modals/StorageSettingsModal`
  picks the provider (unimplemented ones disabled as
  "coming soon"); choosing a cloud provider (Nextcloud, OneDrive, or Google Drive) replaces
  the modal
  body with that provider's setup view (a Back button returns to the provider list), and
  the provider becomes active only on a successful connect, not on merely opening its
  setup. `modals/NextcloudConnectForm` collects the instance URL, username, app password
  (with the exact Settings → Security path and a never-your-account-password warning), and
  file path, discloses that data passes through the relay, and shows the connected
  target with a Disconnect button. The two OAuth providers have no form fields (auth is an
  interactive popup), so `modals/OneDriveConnectForm` and `modals/GoogleDriveConnectForm`
  are thin wrappers over the shared `modals/CloudConnectForm` (a disclosure node + Connect
  button calling `onConnect`, or the connected state with a Disconnect button), each
  supplying only its label and disclosure copy (OneDrive → Microsoft sign-in, app's own
  OneDrive folder; Google Drive → Google sign-in, app's own hidden Drive app-data folder).
  Every connected cloud view (all three) shows the shared `modals/AutosaveToggle` — the one
  device-local "Autosave & autoload" checkbox, its `autosaveEnabled`/`onAutosaveChange` threaded
  from `useStorage` through `StorageSettingsModal`. `StorageControls` opens the settings modal
  automatically when `promptSettings` is set (a never-configured device), deriving the modal's
  open state from `settingsOpen || promptSettings` and dismissing the prompt on close.
  `modals/ConflictModal` (shared `Modal`) offers keep
  this device / take the other on a divergent load or a save-time conflict.

### Storage api service (`server/`)

A standalone Node/Hono api project (its own Yarn 4 install and `yarn.lock`,
**not** part of the app's install — different runtime and deps: Hono + tsx),
exposing the same-origin `/api/*` backend later storage phases extend with
relay/OAuth routes. `server/src/` is grouped by concern: `index.ts` (the entry
that mounts the sub-apps) and `env.ts` (the shared required-env accessor) at the
root, the Hono sub-apps under `routes/` (`nextcloud.ts`, `oauth.ts`), and the SSRF
guard under `security/` (`ssrf.ts`); each colocated with its `*.test.ts`.
Phase 2 shipped a CORS lock and `GET /api/health`
(returns `ok`); **phase 3** adds the Nextcloud WebDAV relay: `nextcloud.ts` (a
`Hono` sub-app mounted at `/api/nextcloud`) forwards one WebDAV request per call —
reading `x-nc-url`, `x-nc-method`, `authorization`, `depth` — rejecting a missing
target/credential (400) or a method outside `{GET, PUT, PROPFIND, MKCOL, DELETE,
MOVE}` (405), and refusing to follow a 3xx (502). `ssrf.ts`'s `assertAllowedTarget`
is the SSRF control: a **fail-closed hostname allowlist** (`NEXTCLOUD_ALLOWED_HOSTS`,
comma-separated) — in production an unset allowlist refuses every forward (503, since
a public relay with no allowlist is an open proxy), a set one is enforced (exact,
case-insensitive hostname match) and https is required; in development an unset
allowlist allows any target (so a local/http Nextcloud works). No DNS/IP machinery —
a pure hostname string match. Both are colocated-tested (`ssrf.test.ts`,
`nextcloud.test.ts`, run by the app's root Vitest). **Phase 4** adds the
confidential-client OAuth relay: `oauth.ts` (a `Hono` sub-app mounted at `/api/oauth`),
generic over provider — `configFor(provider)` resolves the fixed token endpoint and
`clientId`/`clientSecret`/`redirectUri` from env vars (`microsoft` via `MS_*`,
`google` via `GOOGLE_*` (phase 5)). A shared `resolveConfig` maps a genuinely unknown provider
to **404** but a known provider whose env is missing/blank to **500** (a server
misconfiguration, so it is not mistaken for an unknown provider — the client surfaces this as a
missing-config hint). `POST /:provider/exchange`
(`{code, codeVerifier}`) and `POST /:provider/refresh` (`{refreshToken}`) forward a
form-encoded grant to the token endpoint and return only `{access_token, refresh_token,
expires_in}`, 400 on a missing field or an upstream failure (with the token endpoint's error
`detail`) — the client secret never
reaches the browser. No SSRF guard (the token endpoints are fixed constants).
`env.ts`'s `env(name, fallback?)` is the required-env accessor (throws when unset).
Both are colocated-tested (`oauth.test.ts`, `env.test.ts`). Run the three-container dev stack
with `docker compose up`: the
`proxy` (nginx, `nginx.dev.conf`) serves the app at `http://localhost:8080`,
forwarding `/` to the Vite dev server (`web`) and `/api/*` to this service
(`api`). `vite.config.ts` gates `hmr.clientPort` on `DOCKER=true` so HMR works
through the proxy in-container without breaking a direct host `yarn dev`. Docker
is additive — host `yarn` workflows are unchanged.

### UI controls (`src/components/ui/`)

`FieldInput` picks the control for a field's `type`: `NumericInput`,
`AutoFitInput` (text), `AutoFitTextarea`, `CheckInput`. `FieldForeignObject`
positions any control in SVG coordinate space. Writable fields two-way bind to
their atom (and go read-only when their optional `readOnlyAtom` is true); derived
fields subscribe read-only.

`PaperPage` is the shared white, A4-proportioned document-style page shell (its
one style, so it never drifts): `EmptyPage`, the `CharacterSheet` loading state,
and the `MarkdownPage` loading state wrap their content in it. It owns no width of
its own — the caller passes `width` (its physical page width in CSS px, from
`@lib/paper/paperSize.ts`, the same source the zoom uses), so it is a fixed sheet
footprint the binder view can shrink-wrap, and an optional `className` for a
per-caller look (the markdown loading sheet adds the hued sheet border/shadow —
shared with `.md-sheet` via one grouped CSS rule so the two can't drift).

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
function). The preview functions come from `src/lib/colors/hueColors.ts` (the same
functions the components use), so the binder spine's and paper tab's tones stay
distinct **and** the preview never drifts from what the component renders. Its
picker styling lives in `ColorPicker.css`.

`ConfirmModal` is the shared `Modal`-based confirmation dialog (used for deleting
binders and tabs). Props are `title`, `message`, `confirmLabel`, an optional
`variant` (`primary`/`danger`), `onConfirm`, and `onCancel`. Its message-plus-actions
**body** is `ConfirmBody` (same props minus `title`), split out so a modal that swaps
its body in place (the template managers) can show a confirmation without nesting a
second `Modal`; `ConfirmModal` is just `Modal` + `ConfirmBody`.

`IconButton` is the shared round, Material-style button: an icon at rest with a
floating text-label pill that fades in on hover/focus. Props are `icon`, `label`
(used as both the pill text and the accessible name), an optional `onClick`, an
optional `labelSide` (`left`/`right`), `variant` (`default`/`danger`), `size`
(`small`/`default`/`large`), and `disabled`; it forwards a ref and spreads any
other native button attributes, so it can back a Radix `asChild` trigger (e.g.
the markdown table's `TableActionMenu` "…" menu). Callers control
stacking via the surrounding container so the pill can sit above neighbours (e.g.
`Binder`'s `TabControls` gives its cluster a high `z-index`).

### Shared helpers (`src/lib`, `src/hooks`)

Framework-agnostic pure helpers live in `src/lib`, **grouped by concern into
subfolders**, each module colocated with its `*.test.ts`: `fields/fieldNodes.ts`
(the field-node factory), `colors/tabHue.ts` (the per-index tab/binder hue),
`colors/hueColors.ts` (the hue → CSS-colour functions for the binder spine and
paper tabs — `binderSpineLight`/`binderSpineDark`/`binderSpineColor`, `tabColor`,
and `tabBorderColor` (the active tab's hued page border) — the **single source of
truth** shared between the modal previews and the components, which consume them as
inline CSS custom properties so the colours never drift from the CSS; `Binder` sets
`tabBorderColor(active tab hue)` as the inherited `--sheet-border-color` that the
`.page` wrapper and the markdown sheets share), `ids/newId.ts`
(`newId()`, the one `crypto.randomUUID()` GUID helper for both binder and page
ids), `navigation/navigation.ts` (the pure `Location` type — which
binder is open and which page is active, or which markdown template is open in its
editor surface — with `libraryLocation`/`markdownTemplateLocation`/`isLibrary`/
`isMarkdownTemplate`/`sameLocation`), and `paper/paperSize.ts`
(`millimetresToPixels` and the `A4_WIDTH_PX`/`A5_WIDTH_PX` physical page widths in
CSS px — the single source for page footprints, used by the page components' widths
and the zoom math), `sorting/compareByLabel.ts` (the shared case-insensitive
`label`-order comparator every binder/template list and dropdown sorts with), and
`url/httpUrl.ts` (`isHttpUrl`, validating an http(s) image URL). The
`storage/` subfolder is the whole-library persistence group (below). Shared React hooks live in
`src/hooks`: `useAutoFitFontSize(ref, value, maxFontSize, axis)` (the
shrink-to-fit loop behind `AutoFitInput`/`AutoFitTextarea`, owning
`DEFAULT_FONT_SIZE`/`MIN_FONT_SIZE`), `usePageScale(naturalWidthPx)` (the persisted
page-view zoom as a viewport-width fraction — derives the scale from the page's
natural width, with step controls and a measured viewport-fit ceiling —
consumed by `PageViewport`), `useNameForm(initialName, onSubmit)` (the name-field state,
mount-focus, and trim/guard submit shared by every add/edit dialogue),
`useDismissOnOutside(ref, active, onDismiss)` (the outside-pointer-dismiss listener
behind the block handle's "+" menu), and
`useNavigation.ts` (the app's location, backed by the
browser History API so Back/Forward step between visited binders and pages):
`useLocation()` reads the persisted `location` atom, `useNavigate()` moves to a
location and pushes a history entry, and `useNavigationHistory()` — called once in
`AppContent` — seeds and applies Back/Forward via `popstate`. `useStorage()` owns
the storage orchestration (see the Storage feature above) and exports
`StorageRemountContext`; `useCloudConnection(ports, actions)` owns the connect/
disconnect/mount-hydrate lifecycle shared by every cloud provider; `useAutosaveFlush(ports)`
owns the `visibilitychange`/`blur`/`beforeunload` listeners that flush a pending autosave
before the page goes inactive (all with the Storage feature). (The whole-library persistence
pure helpers live under
`src/lib/storage/` (which now also holds `snapshot.ts`) and `src/migrations/`, also documented
with the Storage feature.)

## Conventions

### Documentation

All code documentation is concise and purpose-driven.

- **Document every** type, function, React component, and class — say what it is
  for, not how it works internally. Leave out branching, edge cases, and
  reasoning.
- **State purpose, not consumers** — a doc comment describes what the thing is
  for, not who calls it or where its value is used. Those are distinct: the
  purpose stays true as callers come and go, so naming consumers both dates the
  comment and leaks another module's concern into it. Write "the active tab's
  hued page border", not "the border colour `Binder` sets on `.page` and the
  markdown sheets".
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
unit tested. `logic/formulas/formulas.ts` + `formulas.test.ts` is the model: rules math
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
`src/lib/colors/hueColors.ts`, the same source the modal previews use (see above).

### File & directory naming

- **Component files:** singular PascalCase (`EditBinderModal.tsx`).
- **Component folders** (a folder named after a component it holds): singular
  PascalCase (`ui/Modal/`, `Binder/`).
- **Folders not named after a component** (groupings): plural camelCase
  (`sections/`, `logic/` — treat an established name like `logic` as its own
  plural).
- **`lib/` and `logic/` are organised into subfolders**, not a flat pile of files.
  In `logic/` each module gets its own folder holding it and its colocated test
  (`logic/formulas/formulas.ts` + `formulas.test.ts`). In `lib/` modules are
  grouped by concern (`colors/`, `fields/`, `ids/`, `navigation/`, `paper/`, `sorting/`, `url/`, `storage/` — and
  `storage/` is further split into `providers/`, `oauth/`, `sync/`). A concern
  folder may hold one or several modules; put a new pure helper in the matching
  concern folder (or a new one) rather than at the `lib/` root.

### Naming: no unapproved abbreviations

Every name you introduce must be spelled out in full — function parameters,
lambda/callback.html parameters, local variables (`let`/`const`), type/interface
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
- Keep rules math in `logic/formulas/formulas.ts` pure and tested; wire it via
  `derivedNode`.
- TS is strict-ish: `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax`
  (use `import type` for types), and `.ts`/`.tsx` extensions are included in
  imports.
- **Path aliases** (defined once in `tsconfig.app.json` `paths` and mirrored in
  `vite.config.ts` `resolve.alias`) shorten cross-directory imports: `@ui/*` →
  `src/components/ui`, `@features/*` → `src/components/features`, `@hooks/*` →
  `src/hooks`, `@lib/*` → `src/lib`, `@type/*` → `src/type` (singular `@type`,
  since TypeScript reserves the `@types/` namespace). Prefer an alias over a
  `../../…` chain that climbs out of the current directory; keep same-directory
  imports relative (`./Foo.css`). Adding a new alias means updating **both** files.
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
