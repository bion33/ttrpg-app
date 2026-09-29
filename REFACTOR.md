# Refactor notes

**Status (2026-09-29):** the items marked ✅ below are done (type-check, build, and
all tests green). Four are deferred: the `empty` page type removal, the string-typed
value model, the `=== 'true'` helper, and the `numberGrid` consolidation.

A critical code-quality review of the project. The codebase is well above average
— genuine logic/layout separation, pure tested helpers, a clean per-instance
factory, consistent documentation. Nothing below is architecturally broken; these
are the concerns worth addressing, most valuable first.

## High-value fixes

✅ 1. **Decide `Sheet.tree`'s fate.** `buildSheet` returns `{tree, fields}`, but every
   consumer (`CharacterSheet.tsx:23`) destructures only `{fields}`. Nothing reads
   `tree.abilities.strength.score.atom` — the "logic reads fields by reference
   through the tree" contract in `CLAUDE.md` is aspirational, not exercised. The
   rich `AbilitiesSection` / `AbilityNodes<A>` generic types built in `abilities.ts`
   are discarded at the boundary because `Sheet.tree` is typed as bare `object`
   (`sheet.ts:14`). Either wire logic through the tree and type it properly, or drop
   `tree` and the generics that only feed it.

✅ 2. **Collapse the two ID helpers.** `binderId()` (`Library/logic/binderId.ts`) and
   `pageId()` (`Binder/logic/pageId.ts`) are byte-identical `crypto.randomUUID()`
   wrappers, in two files with two colocated test files and near-identical docblocks.
   One shared `newId()` in `src/lib` collapses both (and their tests).

~~✅ 3. **~~De-duplicate the modal form.** `AddTabModal` / `AddBinderModal` / `EditTabModal`
   / `EditBinderModal` each hand-roll: `name` state, the `focus()` effect, a `submit`
   that trims + guards empty + calls back, and identical `Cancel` / primary-button
   markup with `disabled={!name.trim()}`. The `submit` function is copy-pasted 4×.
   A `useNameField` hook or a shared name-form body removes ~40 duplicated lines. The
   two Edit modals differ only in title, `maxLength`, presets, and preview colour fn.

✅ 4. **Fix the drifted hue→colour constants (JS ↔ CSS duplication).** `EditBinderModal`'s
   `spineColor` returns `hsl(hue 45% 45%)`, but the actual cover in `Library.css:83`
   renders `hsl(hue 45% 46%)`→`45% 34%` — the modal's "live preview" does **not** match
   what it produces. `tabColor` (`55% 82%`) matches the tab background but not its
   `60% 86%` hover. The lightness/saturation constants live in two places per colour
   and have already drifted; that is exactly the drift `ColorPicker.preview` was meant
   to prevent. Give each colour one source of truth shared between the JS preview and
   the CSS.

✅ 5. **Add an error path to the SVG fetch.** `CharacterSheet.tsx:25` has no `.catch`; a
   failed fetch leaves "Loading…" forever. The extraction regex
   `/<svg[^>]*>([\s\S]*)<\/svg>/` is greedy and brittle (acceptable for a controlled
   asset, but pair it with an error state).

## Dead code / unused complexity

- **`Sheet.tree` is dead** — see fix 1 above.
⏳ - **`empty` page type** is "slated for removal" (per `CLAUDE.md`) but still built and
  offered in the add-page menu (`pageTypes.ts`, `renderPage`). Known debt.
✅ - **`derivedNode` / `computedInputNode` accept `CheckFieldDefinition`** in their
  signatures, but a derived/computed checkbox is never used — the union widens the API
  past real use.

## Duplication (TypeScript)

⏳ - **`=== 'true'` string-boolean read appears 6×** (`abilities.ts` ×3, `combat.ts`,
  `FieldInput.tsx`…). Because every atom is string-typed, each checkbox read
  re-implements the string→bool convention inline. A `checkedAtom(node)` /
  `isChecked(get, node)` helper centralizes it — and flags the deeper smell that *all*
  values are stored as strings and re-parsed at every read site.
⏳ - All values are stored as strings and re-parsed at every read site: TBD

## Duplication (CSS)

✅ - **Fixed corner-cluster rules repeated 4×.** `.tab-controls`,
  `.tab-controls__library`, `.tab-controls__to-top` (`TabControls.css`) and
  `.view-controls` (`ViewControls.css`) all share
  `position:fixed; z-index:300; display:flex; flex-direction:column; gap:0.75rem`
  plus `1.5rem` corner insets. A shared `.corner-cluster` utility carries it.
✅ - **`@media print { display:none }` for chrome is duplicated in 4 files** (`Tabs.css`,
  `TabControls.css`, `ViewControls.css`, `Binder.css`). A single `.no-print` utility
  class applied in markup replaces all four blocks.
✅ - **No design tokens.** `'Times-Roman', serif` is repeated in Library/Modal/PaperPage;
  the parchment palette (`#e9e4d8`, `#f6efe0`, `#b7a97f`, `#2c1f14`, `#333`) is
  hardcoded per file, with `index.css` (4 lines) owning nothing. z-index values
  (1, 2, 5, 10, 200, 300, 1000) are scattered with comments cross-referencing each
  other by number ("Above the page (z 10) and every tab (up to z 200)") — fragile
  coupling with no shared scale.

## Single-responsibility / maintainability

✅ - **`Library` reaches into another component's storage during render**
  (`Library.tsx:81,85`): `localStorage.getItem(\`${binder.id}:pages\`)` and
  `:activePage` are read synchronously in `.map`, bypassing jotai. Not reactive (a
  binder's tabs won't update on the shelf without a remount), runs every render, and
  hardcodes another feature's storage-key format outside that feature. The pure
  helpers (`binderTabs`, `activePage`) are clean, but their input arrives via a side
  channel.
⏳ - **`numberGrid` is under-used and inconsistent.** Only `combat.ts` uses it (one 2×2
  grid), while `spells.ts` and `traits.ts` hand-roll their own row/grid loops with
  manual `offsetY` arithmetic. Either the helper is too narrow (numbers only; no
  per-cell type/shape, which is why the damage grid can't use it) or the per-section
  row builders are the real pattern and `numberGrid` should go. Two idioms exist today
  for "place fields on a grid."
