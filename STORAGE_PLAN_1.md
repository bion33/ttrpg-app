# Storage Plan — Phase 1 (snapshot + sync core, file provider)

Concrete build plan for **phase 1** of [STORAGE_PLAN.md](./STORAGE_PLAN.md). This is
the one shippable, user-testable slice that stands up the entire persistence core —
snapshot, migrations, conflict logic, adapter interface, connection store, and the
UI — behind the **file provider only**. No API functions, no auth, no cloud.

Read STORAGE_PLAN.md for the model and rationale; this file is the task list.

## Deliverable (what a user can test)

From the running app, a user can:

- **Export** the whole library to a JSON file they choose (Save button).
- **Import** such a file back (Load button), replacing local data, with the app
  visibly reflecting the loaded characters/binders.
- Hit the **conflict flow**: import a file that diverges from unsaved local edits and
  get the choose-which modal (keep this device / take the other).

Everything cloud-shaped (`readRevision` probing, silent save, auth) is stubbed or
absent; the file provider computes conflict status at import time from the chosen
file. The pure core (`evaluateSync`, snapshot, migrations) is fully built and
unit-tested here so later phases just add providers.

## New files

```
src/lib/snapshot.ts                      + snapshot.test.ts
src/lib/migrations.ts                    + migrations.test.ts
src/lib/storage/StorageProvider.ts       (types only)
src/lib/storage/sync.ts                  + sync.test.ts
src/lib/storage/connectionStore.ts       (IndexedDB, device-local sync state)
src/lib/storage/fileProvider.ts          + fileProvider.test.ts (parse/serialise)
src/lib/storage/providers.ts             (provider registry)
src/hooks/useStorage.ts
src/components/features/Storage/StorageControls.tsx      + .css
src/components/features/Storage/modals/StorageSettingsModal.tsx
src/components/features/Storage/modals/ConflictModal.tsx
```

Touched: `src/App.tsx` (root jotai `Provider` + store swap), `Library.tsx` and
`Binder.tsx` (mount `StorageControls`).

New dependencies: **`idb-keyval`** (promise-based IndexedDB key/value; see
`connectionStore.ts`) and **`hash-sum`** (tiny, browser-safe, sync hash; see
`snapshotHash`). `hash-sum` is chosen over `object-hash` because the latter pulls in
Node's `crypto` and may not bundle cleanly for the browser under Vite — confirm
`hash-sum` bundles at step 1, and if a swap is ever needed, hashing a sorted-key
`JSON.stringify` of `entries` with any browser-safe hash is equivalent.

## Pure core (logic, `function` keyword, colocated tests)

### `src/lib/snapshot.ts`

```ts
interface LibrarySnapshot {
  version: number
  revision: string          // GUID minted at save time (newId())
  savedAt: string           // ISO; display only
  entries: Record<string, string>
}

interface StorageLike {     // the subset of the Storage API we use (inject window.localStorage)
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear(): void
}

function createSnapshot(storage: StorageLike, revision: string, savedAt: string): LibrarySnapshot
function applySnapshot(storage: StorageLike, snapshot: LibrarySnapshot): void  // migrates, clears, writes
function snapshotHash(snapshot: LibrarySnapshot): string                       // hash-sum of stable-serialised entries
```

- `createSnapshot` reads **every** key from `storage` into `entries` (no filtering —
  `location`/`pageScale` included). `revision`/`savedAt` are injected (keeps it pure
  and testable; the hook passes `newId()` and `new Date().toISOString()`).
- `applySnapshot` calls `migrateSnapshot` first, then `storage.clear()`, then writes
  each entry. Replace semantics, not merge.
- `snapshotHash` serialises `entries` with keys sorted, then hashes with
  **`hash-sum`** (deterministic regardless of insertion order) — used for `baseHash`
  and dirty detection.
- Tests: round-trip (`create` → `apply` into a fresh fake yields identical keys),
  replace-not-merge (pre-existing unrelated key is gone after apply), empty-store,
  hash stability under key reordering.

### `src/lib/migrations.ts`

As specified in STORAGE_PLAN.md: append-only `MIGRATIONS: Migration[]` (**empty** in
phase 1), derived `CURRENT_VERSION` (= 1), and:

```ts
function migrateSnapshot(snapshot: LibrarySnapshot): LibrarySnapshot  // applies newer migrations in order
```

- Rejects `version > CURRENT_VERSION`.
- Tests: no-op at current version; rejects newer; (with a fake 2-step migration list
  injected) applies in order from an old version. To keep `MIGRATIONS` empty yet test
  the engine, expose an internal `runMigrations(snapshot, migrations)` the public
  `migrateSnapshot` calls with the real list, and test `runMigrations` with fakes.

### `src/lib/storage/sync.ts`

The conflict decision from STORAGE_PLAN.md, pure:

```ts
type SyncStatus = 'upToDate' | 'localAhead' | 'remoteAhead' | 'diverged' | 'noRemote' | 'remoteMissing'

function evaluateSync(input: {
  remoteRevision: string | null
  baseRevision: string | null
  dirty: boolean
}): SyncStatus
```

- Implements the full truth table verbatim. Test **every row** of that table (nine
  rows) plus the two resolution transitions land at `upToDate`.

## Adapter, providers, connection store

### `src/lib/storage/StorageProvider.ts`

The `StorageTarget` and `StorageProvider` interfaces from STORAGE_PLAN.md (types
only). `load` returns `LibrarySnapshot | null`; `readRevision` returns
`string | null`.

### `src/lib/storage/fileProvider.ts`

Implements `StorageProvider` for `provider: 'file'`:

- `connect` / `isConnected` — no-op / always true.
- `readRevision` — returns `null` (a file can't be probed silently; status is
  computed at import from the chosen file).
- `save(_target, snapshot)` — serialise to JSON and write via `showSaveFilePicker`
  when available, else an anchor download. `_target` unused (user picks each time).
- `load(_target)` — read via `showOpenFilePicker` when available, else a hidden
  `<input type="file">`; parse and validate into a `LibrarySnapshot`, or `null` if
  the user cancels.
- Pure, testable part factored out and tested: `serialiseSnapshot(snapshot): string`
  and `parseSnapshot(text: string): LibrarySnapshot` (validates shape/version; throws
  a clear error on garbage). The DOM picker/anchor glue is thin and not unit-tested.

### `src/lib/storage/providers.ts`

```ts
const PROVIDERS: Record<StorageTarget['provider'], StorageProvider>  // phase 1: only 'file' registered
function getProvider(id: StorageTarget['provider']): StorageProvider
```

Later phases register their providers here — the registry is the single seam.

### `src/lib/storage/connectionStore.ts`

Device-local state that **must not** enter the snapshot, so it lives in **IndexedDB**,
not `localStorage`:

```ts
interface SyncState { baseRevision: string | null; baseHash: string | null }

function loadSyncState(): Promise<SyncState>
function saveSyncState(state: SyncState): Promise<void>
function loadActiveProvider(): Promise<StorageTarget['provider'] | null>
function saveActiveProvider(id: StorageTarget['provider'] | null): Promise<void>
```

- Backed by **[`idb-keyval`](https://github.com/jakearchibald/idb-keyval)** (tiny,
  widely used promise-based key/value over IndexedDB) — a new runtime dependency;
  `connectionStore.ts` is a thin typed wrapper over its `get`/`set`/`del` under a
  dedicated store. No hand-rolled IndexedDB code.
- Phase 1 stores only `SyncState` and the active provider id. Cloud phases add
  per-target credentials/tokens here.

## Hook — `src/hooks/useStorage.ts`

Owns orchestration and exposes to the UI:

```ts
interface UseStorage {
  status: SyncStatus            // recomputed from current dirty + last known remote revision
  dirty: boolean
  provider: StorageTarget['provider'] | null
  save(): Promise<void>         // createSnapshot(newId, now) -> provider.save -> update SyncState
  load(): Promise<void>         // provider.load -> evaluateSync -> apply or raise conflict
  conflict: ConflictPrompt | null  // set when load hits `diverged`; resolves via keep/take
  resolveConflict(choice: 'keepLocal' | 'takeOther'): Promise<void>
  setProvider(id): void
}
```

- **Dirty** is derived, with the null-base rule from STORAGE_PLAN.md:
  `dirty = baseHash === null ? libraryHasData() : snapshotHash(createSnapshot(...)) !== baseHash`.
  When never synced (`baseHash === null`), an **empty** library counts as clean so a
  first import evaluates as `remoteAhead` (a clean load), not `diverged`;
  `libraryHasData()` is true when the snapshot has any binder/page/field entry.
  Recompute on demand; the UI re-checks on focus and after edits.
- **save**: mint `revision = newId()`, build snapshot, `provider.save`, then persist
  `SyncState = { baseRevision: revision, baseHash: snapshotHash(...) }`.
- **load** (file): `provider.load()` → if `null` (cancelled) stop; else
  `evaluateSync({ remoteRevision: file.revision, baseRevision, dirty })`:
  - `remoteAhead` / `upToDate` → `applySnapshot`, then trigger the store swap
    (below), then set `SyncState` from the loaded revision.
  - `localAhead` → the user picked an **older** file while having newer local edits;
    don't silently discard — surface the conflict flow (same as `diverged`) so they
    can confirm "load anyway" (take other) or keep local.
  - `diverged` → set `conflict`; the modal drives `resolveConflict`.
- **resolveConflict**: `keepLocal` → keep local as-is (no write needed on import; a
  save is only performed for a cloud target's overwrite); `takeOther` → apply the
  held snapshot + store swap + update `SyncState`.

### Re-reading atoms after a load — root store swap

`applySnapshot` bulk-writes `localStorage`, but jotai's `atomWithStorage` atoms
already hold values in the **default store** and won't notice. Bumping a React `key`
does **not** help — atom values live in the store, not the component tree.

**Mechanism:** wrap the app in a jotai `<Provider store={store}>` whose `store` is
held in `App` state. After a load/apply, create a **new** store
(`createStore()`) and set it; every `atomWithStorage` re-initialises from the
now-updated `localStorage`. Expose a `remount()` callback (via context or a passed
prop) that `useStorage` calls post-apply.

- `App.tsx`: `const [store, setStore] = useState(() => createStore())`, render
  `<Provider store={store}>…</Provider>`, and provide `remount = () => setStore(createStore())`.
- Confirm `atomWithStorage` reads storage on init in a fresh store (it does for sync
  storage; `fieldNodes` already passes `getOnInit: true`). Verify `binderAtoms`'
  cached per-prefix atoms still resolve against the new store (they are module
  singletons keyed by prefix — fine; only their store-held values reset).

## UI

### `StorageControls.tsx` (+ `.css`)

A `corner-cluster` of `IconButton`s reflecting `useStorage()`:

- Buttons top→bottom: **Settings** (opens `StorageSettingsModal`), **Load**, **Save**.
- Enable rules (phase 1, file provider): Save and Load are always enabled (each
  prompts for a file); the cloud-style `status`-gating is wired but only meaningful
  once a probing provider exists. Show a transient saving/saved/error state.
- `placement` prop:
  - `binder` → rendered by `Binder`, in the **top-left cluster underneath the
    "Back to library" button** (same `corner-cluster` column as `TabControls`'
    `tab-controls__library`, stacked below it).
  - `library` → rendered by the `Library` grid, in the **bottom-right corner**.
- `no-print`, uses shared `IconButton`, tokens from `index.css`, rem units.

### `StorageSettingsModal.tsx`

Built on shared `Modal` + `.modal__*` classes. Phase 1: lists providers from the
registry (only **File / import-export** active; cloud entries shown disabled as
"coming soon"). No connect/target concept for file. This is the seam later phases
extend with connect forms (and their **security disclosures** per STORAGE_PLAN.md).

### `ConflictModal.tsx`

Built on shared `Modal`. Shows both `savedAt`s (local base vs incoming) and two
actions: **Keep this device** (→ `resolveConflict('keepLocal')`) and **Take other
device** (→ `resolveConflict('takeOther')`), plus Cancel. Danger/primary variants via
`.modal__btn--*`.

### Mounting

- `Binder.tsx`: render `<StorageControls placement="binder"/>` near `TabControls`.
- `Library.tsx`: render `<StorageControls placement="library"/>` in the grid branch.
- Both read the same global `useStorage()` state; only one is visible per view.

## Build order (each step compiles + tests green)

1. `snapshot.ts` + test (`snapshotHash` via `hash-sum`; confirm it bundles for the browser).
2. `migrations.ts` + test.
3. `sync.ts` + test (the full truth table — the heart of this phase).
4. `StorageProvider.ts` types; `connectionStore.ts` (`idb-keyval` wrapper).
5. `fileProvider.ts` + parse/serialise test; `providers.ts` registry.
6. `useStorage.ts` (orchestration) — unit-test the decision branches by injecting a
   fake provider and fake `connectionStore` where practical.
7. Root `Provider`/store-swap in `App.tsx`; verify a manual `localStorage` poke +
   remount re-renders.
8. `StorageControls` + `StorageSettingsModal` + `ConflictModal`; mount in `Binder`
   and `Library`.
9. Manual end-to-end: export, edit, import same file (no conflict), import a
   divergent file (conflict modal), import into a clean load (replaces).

## Conventions to honour

- `src/lib` + `logic`: named `function`s, not arrow consts; 120-col `/** */`
  docblocks on every type/function/component; colocated `*.test.ts`.
- Full names, no new abbreviations (`index`, `element`, `definition`, …).
- CSS in rem (except 1px borders/shadows); shared tokens/utilities from `index.css`
  (`corner-cluster`, `no-print`, `--z-*`); `IconButton`/`Modal` reused, not
  reinvented.
- Update **CLAUDE.md** in the same change: new `features/Storage/` feature, the
  `src/lib/storage/` group, the `snapshot`/`migrations` helpers (with `hash-sum` for
  change detection), the `useStorage` hook, and the root jotai `Provider`/store-swap.

## Out of scope for phase 1

API functions, Docker/nginx, OAuth/MSAL/GIS, Nextcloud relay, `readRevision`
probing, silent/auto save, per-target credentials, autosave. All land in phases 2–6.
