# Storage Analysis — persisting character data to disk

Brainstorming notes on giving the app durable, ideally user-controlled file
persistence. Current state: field values persist to `localStorage` (per-binder /
per-page storage-prefix namespaces).

## The goal

Ideal UX: **"select a file or directory once, then pressing a Save button is
enough to save it any time"** — silently, with no repeated prompts — and it must
work on **Firefox (desktop + Android)** and **Chrome**.

## Verdict

There is **no truly cross-browser way** to get that exact UX (pick a real,
user-visible folder once, then silently write to it forever). The blocker as of
2026: Firefox still does **not** natively support `showDirectoryPicker` /
`showSaveFilePicker` / `showOpenFilePicker` on desktop **or** Android — only
Chromium (Chrome, Edge, Opera) does. So "pick a real directory, then Save writes
there" is Chromium-only.

## Options

| Approach | "Pick once, then silent save" | User picks location | Files visible in file manager | Cross-browser |
|---|---|---|---|---|
| **OPFS** (Origin Private File System) | ✅ yes — write silently any time, no gesture, no re-prompt | ❌ no (sandboxed per-origin, browser-chosen) | ❌ no | ✅ Chrome + Firefox 111+ desktop & Android |
| **File System Access API** (real dir handle) | ⚠️ silent, but needs a re-grant *click* after each reload | ✅ yes | ✅ yes | ❌ Chromium only |
| **Download / anchor** | ❌ prompts or dumps to Downloads each time | partial | ✅ yes | ✅ everywhere |
| **Own backend / cloud (Drive, etc.)** | ✅ yes (after auth) | ✅ (a cloud folder) | ⚠️ only via that cloud | ✅ everywhere, needs server + auth |

### Notes per option

- **OPFS** — closest single cross-browser primitive to the goal. Shipped in
  Firefox 111 (desktop + Android) and all Chromium browsers. Persistent, large
  quota (up to ~60% of disk in some cases), and a Save button can write silently
  with no re-prompt and no user gesture. Catch: the user does **not** choose the
  location and can't browse the files in their normal file manager — it's an
  app-private store.
- **File System Access API** — gives a real, user-chosen directory with
  read/write, but is Chromium-only, requires a secure context (HTTPS/localhost),
  and after each reload the permission drops to "prompt" — you must call
  `requestPermission()` again from a user gesture (a click). Handles can be
  stashed in IndexedDB to survive sessions, so it's "one re-grant click per
  session, then silent."
- **Download / anchor** — universal but not "silent repeated save"; each save
  prompts or lands in Downloads.
- **Backend / cloud** — works everywhere and can be genuinely silent after auth,
  but needs a server and auth, and the app is currently a pure client-side
  static app.

## Recommended pattern (both goals)

Most apps split the two concerns:

1. **Always-on silent autosave** to an app-private store — **OPFS** (or even just
   IndexedDB, which is a small step up from today's `localStorage`). Identical
   behaviour on Firefox Android and Chrome, larger quota, no prompts.
2. **Explicit Export / Import to a real file** for portability (moving a
   character to another device or browser). On Chromium this can use
   `showSaveFilePicker` for a nice native save-anywhere; on Firefox it falls back
   to a normal download. Occasional, so the per-save Firefox prompt is
   acceptable.

A user-chosen synced folder that behaves the same in Firefox Android and Chrome
is **not** achievable without a backend.

## Fit with this app

- Data model is already namespaced by storage-prefix (binder id `:` page id), so
  swapping the persistence layer under it is localized.
- Swapping `localStorage` → OPFS would give silent cross-browser persistence plus
  much larger quota; add a manual Export/Import button for cross-device moves.

## Open questions to revisit

- Is app-private storage acceptable, or is a user-visible folder a hard
  requirement? (Determines OPFS vs. Chromium-only vs. backend.)
- Is a backend/cloud sync ever on the table? (Only path to real cross-device,
  cross-browser, silent, user-visible.)
- Export format for portability — one file per binder, or a whole-library bundle?

## Sources

- [MDN File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
- [MDN showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)
- [MDN showDirectoryPicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker)
- [Chrome for Developers: File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- [Firefox Bug 1811001 — OPFS on Release](https://bugzilla.mozilla.org/show_bug.cgi?id=1811001)
- [File System Access Firefox extension](https://addons.mozilla.org/en-US/firefox/addon/file-system-access/)
