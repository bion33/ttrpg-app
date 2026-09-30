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

`App` is the root: it holds the jotai store in state and renders the app inside a
jotai `<Provider store={store}>`, exposing a `remount()` (a fresh `createStore()`)
through `StorageRemountContext` so a storage **load** can swap the store and make
every `atomWithStorage` atom re-read the bulk-rewritten `localStorage` (see the
Storage feature below); `AppContent` inside the provider wires navigation and
renders `Library`. The **library**
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

### Storage feature (`src/components/features/Storage/`, `src/lib/storage/`, `src/hooks/useStorage.ts`)

Durable, whole-library persistence beyond `localStorage`. Persistence is **not**
per-field: the entire `localStorage` key space is snapshotted to one JSON document
and hydrated back, so the sync layer is fully decoupled from the field-node system.
Phase 1 ships the pure core plus the **file provider** only (export/import); cloud
providers land in later phases behind the same seams.

- **Snapshot (`src/lib/snapshot.ts`).** `LibrarySnapshot` (`version`,
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
  `canSave`/`canLoad`, `saveIntent`), unit-tested over every `(status, probeable)`
  combination so the hook and the controls can never disagree about enablement or the
  save guard. `resolveTarget(provider, connections)` takes a `CloudConnections` bag
  (`{nextcloud, oneDrive, googleDrive}`) — additive as providers are added, not a per-provider
  parameter — and owns the fixed snapshot filename (`SNAPSHOT_FILENAME = 'ttrpg-app.json'`),
  passed to both cloud providers as `target.locator`. `connectionStore.ts` — device-local
  `SyncState` (`baseRevision`/`baseHash`),
  the active provider id, the `NextcloudConnection`
  (`load`/`save`/`clearNextcloudConnection`), the `OneDriveConnection`
  (`load`/`save`/`clearOneDriveConnection`), and the `GoogleDriveConnection`
  (`load`/`save`/`clearGoogleDriveConnection`, storing the resolved `fileId`) in
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
  `modals/ConflictModal` (shared `Modal`) offers keep
  this device / take the other on a divergent load or a save-time conflict.

### Storage api service (`server/`)

A standalone Node/Hono api project (its own Yarn 4 install and `yarn.lock`,
**not** part of the app's install — different runtime and deps: Hono + tsx),
exposing the same-origin `/api/*` backend later storage phases extend with
relay/OAuth routes. Phase 2 shipped a CORS lock and `GET /api/health`
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
`AppContent` — seeds and applies Back/Forward via `popstate`. `useStorage()` owns
the storage orchestration (see the Storage feature above) and exports
`StorageRemountContext`; `useCloudConnection(ports, actions)` owns the connect/
disconnect/mount-hydrate lifecycle shared by every cloud provider (also with the Storage
feature). (The whole-library persistence pure helpers live under
`src/lib/storage/`, `src/lib/snapshot.ts`, and `src/migrations/`, also documented
with the Storage feature.)

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
