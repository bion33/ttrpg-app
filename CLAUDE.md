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

A TTRPG character web app. A **library** holds **binders**; each binder holds an
ordered list of **pages** (tabs). Pages come in types — several traced
character-sheet pages, a markdown "Notes" page, and an empty stand-in. A traced
page's UI is a scanned/traced sheet image exported as an SVG, with interactive
HTML form controls overlaid exactly on top of the printed fields. All state
persists to `localStorage`; a durable sync layer snapshots the whole
`localStorage` key space to external providers (file, Nextcloud, OneDrive,
Google Drive).

Stack: React 19 + TypeScript, Vite, [jotai](https://jotai.org) for state,
Vitest for tests, ESLint. Package manager: **yarn** (Yarn 4 / Berry; run via
corepack, e.g. `npx corepack@latest yarn …`). A separate `server/` is a
standalone Node/Hono API (its own Yarn install) exposing the same-origin
`/api/*` relay/OAuth backend the cloud storage providers use.

## Commands

- `yarn dev` — Vite dev server with HMR.
- `yarn build` — type-check (`tsc -b`) then Vite production build.
- `yarn lint` — ESLint over the repo.
- `yarn preview` — serve the built `dist/`.
- `yarn test` — Vitest (test files are `*.test.ts` colocated with source).
- `docker compose up` — three-container dev stack (nginx proxy at
  `http://localhost:8080` → Vite `web` + Hono `api`); additive, host `yarn`
  workflows unchanged.

## Directory map

- `src/components/features/` — one folder per feature (`Library/`, `Binder/`,
  `PageViewport/`, `Templates/`, `Storage/`, and `pages/` holding the page-type
  features). Feature-specific components live in their feature folder, **not** in
  `ui/`.
- `src/components/ui/` — shared, feature-agnostic controls (see UI controls
  pattern).
- `src/lib/` — framework-agnostic pure helpers, grouped by concern into
  subfolders (`colors/`, `dnd/`, `fields/`, `ids/`, `images/`, `navigation/`,
  `number/`, `paper/`, `sorting/`, `url/`, `storage/`).
- `src/hooks/` — shared React hooks.
- `src/type/` — shared field-node types.
- `src/migrations/` — snapshot migration engine + one file per version.
- `server/` — the standalone API service.
- `public/` — source artwork assets (the traced SVGs, OAuth callback pages).

## Core patterns

These are the architectural ideas the whole app is built from. When extending,
follow the established pattern rather than inventing a parallel one.

### Field nodes (traced sheets)

The field-node model lives in `src/type/` and `src/lib/fields/fieldNodes.ts`.

- **Every field is a node** carrying both its layout (`definition`) and the jotai
  atom holding its value — position and state are one object.
- A `FieldDefinition` gives layout in **viewBox units, not pixels** (`id`,
  `x/y/width/height`, `type`, optional `fontSize`/`textAlign`/`defaultValue`).
  Per-type extras live in **dedicated subtypes** (`CheckFieldDefinition`,
  `NumericFieldDefinition`, `ImageFieldDefinition`), never as flags on the base
  type.
- Atoms hold the field's **natural typed value** — `string`, `number | null`
  (`null` = empty), or `boolean`. Cross-field logic reads atoms directly with no
  parsing; **parsing/formatting lives only in the UI controls**, the single
  boundary.
- `InputNode<T>` = writable (persisted, or computed-with-fallback) atom, with an
  optional `readOnlyAtom` to lock editing at runtime. `DerivedNode<T>` = read-only
  atom computed from other atoms, not persisted.
- A sheet is built **per instance** from a storage prefix, never as module-level
  singletons. `createSheetFactory(prefix)` returns a `SheetFactory` bundling the
  node builders (`inputNode`, `checkNode`, `numericNode`, `computedInputNode`,
  `derivedNode`), all bound to that prefix so each sheet gets an isolated
  `localStorage` namespace. **One factory instance per sheet instance** — all its
  fields must come from it. (Prefer the typed builders — `checkNode`,
  `numericNode` — over casting a base `inputNode`.)
- Image fields are ordinary `InputNode<string>`s whose string value *encodes* the
  image (and, for `imageTextarea`, the prose too, via a pure tested codec in
  `fields/`). No special node type.
- `collectNodes(tree)` flattens a nested `NodeTree` into a flat render list.

### Traced-sheet pages

Every traced-artwork page (CharacterPage, CharacterInfoPage, EquipmentPage, …)
follows the **same shape**:

- A `layout/` folder is the single source of truth for the page's fields, built
  per instance:
  - `layout/sheet.ts` exports `build<Name>Sheet(storagePrefix)` — creates the
    factory, calls each section builder, gathers their nodes into a structured
    tree, and returns `{fields}` (the flat `collectNodes` render list).
  - `layout/sections/*.ts` — each exports a `build<Section>(factory)` returning
    that region's nodes. **A field is created exactly once, in its section
    builder.** A section owns the repeated-row builders and step constants it
    alone uses; only builders/constants shared across sections go in a common
    `generators.ts`/`constants.ts`.
  - `logic/formulas/formulas.ts` + `formulas.test.ts` — **pure**, unit-tested
    rules math specific to the sheet. Atoms wire it in via `derivedNode`. Rules
    math reused across sheets lives in `@lib/dnd`, `@lib/number`, etc.
- A thin `<Name>Page.tsx` component takes a `storagePrefix`, memoizes its
  `build…Sheet(prefix)`, and renders the resulting `fields` through the shared
  **`TracedSheetPage`** — the single implementation of the fetch-and-inject-SVG +
  A4-padding + overlay-fields-in-the-artwork's-coordinate-space pattern. The page
  component is just config (SVG url, artwork extent, error copy, optional
  `fieldOverlays` for SVG decoration painted above a given field).

Adding a traced sheet = a new `layout/` + a thin wrapper + registry wiring (see
Page registry).

### Markdown page

The `markdown` ("Notes") page is a [Tiptap](https://tiptap.dev) v3 WYSIWYG
editor persisting content as a **plain markdown string** (riding the same
`localStorage` → snapshot → providers path, no new persistence plumbing). Key
decisions: the heavy editor is `React.lazy`-split; custom Tiptap extensions
(callout, page break, a custom pagination extension, table node views) round-trip
to plain markdown; **pagination break math is pure and unit-tested** in
`logic/pagination/`, with the DOM-measuring extension wiring it in; the editor
draws its own stacked physical-A4 sheets so it is true WYSIWYG and print maps
sheet→page via CSS fragmentation. Block insert/apply actions have a **single
source of truth** (`blocks/insertBlocks.ts`) projected into both the toolbar and
the block handle so they never drift.

### Library / Binder / navigation

- `App` holds the jotai store in state inside a `<Provider>` and exposes
  `remount()` (a fresh store) via `StorageRemountContext`, so a storage **load**
  can swap the store and make every `atomWithStorage` atom re-read bulk-rewritten
  `localStorage`.
- The **library** is a grid of binder covers (`atomWithStorage('binders', …)`,
  empty by default). A binder's `id` is a `crypto.randomUUID()` GUID
  (`@lib/ids/newId.ts`) that survives renames and is the **storage-prefix root**
  every one of its pages persists under.
- A `Binder` renders per open binder, keyed by id. Its page list is a
  **per-binder** atom (`pagesAtom(prefix)`, one cached instance per prefix, shared
  with the library shelf). Pages are serialisable metadata (`id`, `label`, `type`,
  `storagePrefix`); each page persists under `pagePrefix(binderPrefix, pageId)`.
  Visited pages stay **mounted but hidden** so tab switches are instant.
- **The active page is the app-wide location**, not per-binder state. A pure
  `Location` type (`@lib/navigation`) captures which binder/page or markdown
  template is open. `useNavigation` backs it with the browser History API so
  Back/Forward work; all navigation goes through `useNavigate`.
- Page-view zoom is the shared **`PageViewport`** scaffold: it owns the scaled
  `.binder-view` wrapper, publishes `--page-scale` (so in-page controls can
  counter-scale to a constant on-screen size), and holds the zoom controls. Zoom
  is stored as a **viewport-width fraction** shared across pages so it feels
  uniform regardless of a page's natural width.

### Page registry

`Binder/pageRegistry.tsx` is the single `Record<PageType, …>` of
`{naturalWidth, render(prefix, active, label)}` — both rendering and width
resolution read it, so they never drift and a new `PageType` is a compile error
until registered. `Binder/pageTypes.ts` holds the `PageType`/`PAGE_TYPES` labels,
kept pure so the add-tab form does not pull in the page component graph. Wiring a
new page type = an entry in both.

### Templates

Library-wide reusable templates (markdown page templates; binder templates =
structure only), riding the same persistence path. Instantiation math is **pure
and tested** (`logic/instantiate/`); a markdown template's body reuses the notes
page's own atom under a `template:<id>` prefix (no new content store). References
resolve to concrete content copies only at creation time (templates stay
live-linked).

### Storage / sync

Persistence is **not per-field**: the entire `localStorage` key space is
snapshotted to one JSON document and hydrated back, fully decoupling sync from the
field-node system. Organised under `src/lib/storage/`:

**Images are a separate channel.** Image *bytes* never enter the snapshot — only a
stable reference does. An image field (and a markdown `![](…)`) holds either an
http(s) URL (remote, rendered as-is) or a relative `images/<slug>-<id>.<ext>` path
(the discriminator is `@lib/images/imageKey`). That one path is at once the OPFS
key, the markdown link target, the cloud filename, and the zip entry — no separate
id mapping. Uploaded bytes live in the browser's OPFS (`@lib/images/imageStore`, a
graceful-degrading glue over `navigator.storage.getDirectory()`); a value is
resolved to a renderable `blob:`/URL src per-session via `useImageSource` (revoked
on change/unmount). `collectImageRefs` (pure) scans a snapshot for referenced
paths — the single source of truth for both GC and cloud reconciliation. Cloud
providers gain **optional** per-file image-folder methods (`listImages`/`putImage`/
`getImage`/`deleteImage`); `reconcileImages` (pure) decides upload/download/delete
from the referenced/local/remote inventories, and `useImageSync` runs it after a
cloud save/load (never blocking the snapshot result). The file provider has no live
folder: it bundles the snapshot + referenced images into a portable **zip** (via
`fflate`) instead, reading a legacy bare `.json` on load.

- A **pure, tested core** — snapshot create/apply/hash (`snapshot.ts`), the
  `evaluateSync` conflict decision (revision lineage, not clocks), and the
  provider-dependent `syncActions` decisions (enablement, save guard, autosave/
  autoload intents) — kept apart from all side-effectful glue.
- **Providers** behind one `StorageProvider` interface (`file`, `nextcloud`,
  `onedrive`, `googleDrive`), each pure URL/payload builders + thin transport. The
  two OAuth providers share one token-client and one cloud-connection lifecycle
  hook; the shared `httpError` builder makes every failure diagnosable. **At most
  one cloud provider is connected at a time**: connecting one clears the other
  clouds' stored connections (`useCloudConnection.reset`, orchestrated in
  `useStorage`), so switching clouds leaves no stale connection behind.
- Migrations: append-only, **one file per version** in `src/migrations/`, never
  edit or renumber an existing one.
- Orchestration is `useStorage()` (+ `useAutosave`, `useAutosaveFlush`,
  `useCloudConnection`), held in a single instance above the library/binder switch
  via `StorageProvider`/`storageContext` so navigation does not remount it.
  Progress/failures surface as `sonner` toasts; the hook otherwise exposes no
  activity/error state.
- Every persisted atom uses `notifyingStorage()` so edits count toward dirty
  detection and the snapshot.
- Device-local state (sync base, connections, autosave preference) lives in
  IndedDB (`idb-keyval`), kept out of the snapshot.
- `server/` relays/token-exchanges for the cloud providers (Nextcloud WebDAV
  relay behind a fail-closed SSRF hostname allowlist; a confidential-client OAuth
  relay generic over provider so the client secret never reaches the browser).

### UI controls

Shared controls in `src/components/ui/`. `FieldInput` picks a control for a
field's `type` via an **exhaustive `switch`** (an `assertNever` default makes a
new type a compile error); every control takes the uniform
`(field, value, onChange[, readOnly])` contract, so there is no node-shape
dispatch. Dialogues are built on the shared `Modal` (which also carries the shared
form styling) + a body-only form split out so a modal can swap its body in place
without nesting a second `Modal`. Other shared pieces: `ActionMenu` (zoom-safe
"…" dropdown), `ImagePanel`/`ImageField`/`ImageUrlModal`, `PaperPage` (the A4
page shell, caller passes width), `ColorPicker`, `ConfirmModal`/`ConfirmBody`,
`IconButton`. When something is used by more than one feature, extract it to `ui/`
with a single owner, rather than copying it.

### Shared helpers

Pure helpers go in `src/lib/<concern>/` (never a flat pile at the `lib/` root),
colocated with their tests. Shared React hooks go in `src/hooks/`. A helper used
by more than one feature belongs here, as the single source of truth — e.g.
hue→colour functions (`@lib/colors/hueColors.ts`) consumed as inline CSS custom
properties by both components and their modal previews so colours can't drift;
physical page widths (`@lib/paper/paperSize.ts`) as the one source for footprints
and zoom math.

## Conventions

### Documentation

All code documentation is concise and purpose-driven.

- **Document every** type, function, React component, and class — say what it is
  for, not how it works internally. Leave out branching, edge cases, and
  reasoning.
- **State purpose, not consumers** — a doc comment describes what the thing is
  for, not who calls it or where its value is used. The purpose stays true as
  callers come and go; naming consumers both dates the comment and leaks another
  module's concern into it. Write "the active tab's hued page border", not "the
  border colour `Binder` sets on `.page`".
- **Use `/** */` docblocks** of 120 characters wide for the doc comment on any
  type, function, component, class, or file-overview header — always the
  multiline form, even for a one-line description:

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
unit tested. `logic/formulas/formulas.ts` + `formulas.test.ts` is the model: rules
math lives apart from field definitions, and layout wires the pure functions in
via `derivedNode`. The same split applies everywhere (pagination, instantiation,
sync decisions, …): pure tested core, thin glue.

### Styling

Global tokens and utilities live in `src/index.css` on `:root`: the type/parchment
palette (`--font-serif`, `--color-parchment`/`-paper`/`-ink`/`-text`/`-border`)
and the stacking scale (`--z-page`/`-controls`/`-modal`). Component CSS references
these rather than re-hardcoding the shared font, colours, or z-index numbers. Two
shared utility classes also live there: `.corner-cluster` (a fixed vertical
control stack; callers add only the corner insets) and `.no-print` (chrome hidden
under `@media print`) — prefer them over per-file copies. Hue-derived colours are
**not** CSS literals: components set them as inline custom properties computed by
`src/lib/colors/hueColors.ts`, the same source the modal previews use.

### File & directory naming

- **Component files:** singular PascalCase (`EditBinderModal.tsx`).
- **Component folders** (a folder named after a component it holds): singular
  PascalCase (`ui/Modal/`, `Binder/`).
- **Folders not named after a component** (groupings): plural camelCase
  (`sections/`, `logic/` — treat an established name like `logic` as its own
  plural).
- **`lib/` and `logic/` are organised into subfolders**, not a flat pile. In
  `logic/` each module gets its own folder holding it and its colocated test. In
  `lib/` modules are grouped by concern. Put a new pure helper in the matching
  concern folder (or a new one) rather than at the `lib/` root.

### Naming: no unapproved abbreviations

Every name you introduce must be spelled out in full — function parameters,
lambda/callback parameters, local variables, type/interface properties, and the
names of components, types, classes, interfaces, functions, files, and
directories alike. **Abbreviating or using a shorthand always requires the user's
approval first**, and they will usually prefer the full word (`factory` over `f`,
`element` over `el`, `options` over `opts`, `definition` over `def`, `index` over
`i`, `centerX` over `cx`, `inputReference` over `inputRef`). Do not introduce a
new abbreviation on your own; propose the full name, and only shorten it if the
user asks. The sole exception is any abbreviation under **Common abbreviations**
below — those are pre-approved.

When the user accepts a particular abbreviation, add it to that list in the same
change so it stays approved going forward.

#### Common abbreviations

- `DC` — Difficulty Class (D&D 5e).
- `AC` — Armor Class (D&D 5e).
- `i` — loop counter, in `for`/`while` loop bodies only (use `index` for
  iterator-callback parameters).
- `config` / `Config` — configuration (e.g. `AbilityConfig`).

### General

- Add or change a field only in its `layout/sections/*` module; never duplicate a
  field id. Within a section builder, cross-field logic reads fields by reference
  off the typed tree (e.g. `abilities.wisdom.skills.perception.bonus.atom`), not
  by id lookup.
- Keep rules math in `logic/formulas/formulas.ts` pure and tested; wire it via
  `derivedNode`.
- TS is strict-ish: `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax`
  (use `import type` for types), and `.ts`/`.tsx` extensions are included in
  imports.
- **Path aliases** (defined once in `tsconfig.app.json` `paths` and mirrored in
  `vite.config.ts` `resolve.alias`): `@ui/*`, `@features/*`, `@pages/*`,
  `@hooks/*`, `@lib/*`, `@type/*` (singular `@type`, since TypeScript reserves the
  `@types/` namespace). Prefer an alias over a `../../…` chain that climbs out of
  the current directory; keep same-directory imports relative. Adding a new alias
  means updating **both** files.
- In `src/lib/` and `logic/`, declare named functions with the `function` keyword,
  not `const` arrow lambdas (arrows are fine for inline callbacks). UI components
  elsewhere keep their existing arrow/`function` style.

## Positioning helper skills

Placing overlays against the artwork is aided by project skills: `locate-svg-label`
(text labels), `locate-svg-circle` (single value circle), `locate-svg-checks`
(round tick-boxes). They require the dev server running with the SVG inlined.

## Keeping this file current

When you change anything this file describes — build/scripts, the core patterns,
the directory/module structure, or the conventions above — update the relevant
section **in the same change**. This file documents **patterns, not a file
inventory**: when you add a feature or module that follows an existing pattern,
you do not need to catalogue it here; document it only when it introduces or
changes a pattern, a convention, or a cross-cutting architectural decision.
