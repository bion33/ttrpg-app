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
  app-private store. **Not** safe from a user clearing site data: OPFS lives in
  the same per-origin storage bucket as `localStorage`/IndexedDB, so "clear
  cookies and other site data" wipes it too — it is no more durable against
  manual clearing than `localStorage`. Its advantages are quota, file semantics,
  and off-main-thread async access, not survival of a data clear. Automatic
  eviction under storage pressure is a separate concern, mitigated for the whole
  origin bucket (OPFS + IndexedDB + `localStorage` alike) by
  `navigator.storage.persist()`.
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

## Cloud providers (Google, Microsoft, Nextcloud)

**Requirement for this section:** we accept deploying **stateless serverless JS
functions** alongside the static build (Vercel/Netlify/Cloudflare, no server
process, no DB). Every design below assumes this is available. It is what makes
the cloud path fully work — without it, durable silent auth is unreachable for
*all three* providers (see the per-provider notes).

Unlike the File System Access API, cloud storage APIs are plain HTTPS `fetch`
calls, so they work **identically on Firefox desktop, Firefox Android, and
Chrome** — the browser-support blocker above disappears. There is, however, **no
single trusted library** covering all three; the realistic setup is three
official per-provider SDKs behind our own small `save(location, data)` /
`load(location)` adapter interface.

| Provider | Auth (official, popular) | Storage API | "Pick once" selector | Silent repeated save? |
|---|---|---|---|---|
| **Google Drive** | Google Identity Services (`google.accounts.oauth2`) | Drive v3 REST (or `gapi.client`) | **Google Picker API** | ✅ while Google session alive (silent token renew); persistent offline wants a backend |
| **OneDrive / SharePoint** | **MSAL.js** (`@azure/msal-browser`), confidential client for durable refresh | Microsoft Graph + `@microsoft/microsoft-graph-client` | **OneDrive File Picker SDK v8** | ✅ within SPA token life; durable needs a refresh function (see below) |
| **Nextcloud** | App password (Basic) or Login Flow v2 | **`webdav`** npm client (perry-mitchell), browser-capable | none — store the WebDAV path | ✅ once credentials stored — **but see CORS** |

### Once the location is known, auto load/save works for all three

Persist a handle (Google file id, Graph item id/path, WebDAV path); thereafter:

- **Google** — `files.get?alt=media` to load, `files.update` (media PATCH) to save.
- **OneDrive** — `GET /me/drive/items/{id}/content`, `PUT …/content`.
- **Nextcloud** — `getFileContents` / `putFileContents` on the `webdav` client.

All silent, no per-save prompt.

### Two real catches

1. **Nextcloud + browser = CORS.** Nextcloud core does **not** send CORS headers
   on `/remote.php/dav`, so a pure client-side app can't reach it from JS directly.
   Our plan routes around this entirely — see below.
2. **OAuth registration + long-term silent auth.** Google and Microsoft each need
   a registered public client id, and **both** need a serverless refresh function
   for silent auth that survives long gaps — see below.

### Google refresh tokens: two stateless serverless functions, no DB

Google's **pure-SPA (GIS) token model gives no refresh token** — silent renewal
works only while the Google session is alive, so it can't cover long gaps with no
session. Durable silent access needs the **authorization code flow with
`access_type=offline`**, whose code-exchange and refresh calls require the web-app
**client secret**, which must never ship in browser JS. That is the *entire*
reason Google wants a "backend" here — and it is satisfied by **two tiny stateless
serverless functions**, not a server or database:

1. **Code exchange** — client posts the auth code; the function exchanges it
   (`client_id` + `client_secret`) for an `access_token` **+ `refresh_token`**.
2. **Refresh** — the function takes a refresh token and returns a fresh
   `access_token`.

The **client stores its own refresh token** (IndexedDB/localStorage) and passes it
to the refresh function when needed, so there is no server-side session or DB; all
actual Drive reads/writes stay in the browser with the short-lived access token.
These functions drop onto the static build (Vercel/Netlify/Cloudflare), you control
their CORS, and nothing runs between requests — far lighter than a full Next.js
migration.

Caveats:

- **Publish the OAuth consent screen.** While it is in "testing," Google expires
  refresh tokens after 7 days, which looks like broken silent auth.
- **Refresh token in browser storage** is a security tradeoff — it's the user's own
  token to their own Drive and is cleared with site data; acceptable here. The
  alternative (functions store it, keyed by a session) reintroduces state + a DB.
- **Microsoft needs the same treatment.** MSAL's PKCE flow does hand a refresh
  token to a pure SPA with no secret, but Microsoft **caps SPA refresh tokens at a
  24-hour lifetime** — silent auth breaks after a day of no session. Durable silent
  access needs a **confidential client**: a `refresh` serverless function holding
  the client secret, exactly like Google's.

### Nextcloud: same-origin serverless proxy (primary), WebAppPassword fallback

**Primary plan — a same-origin serverless proxy.** CORS is a *browser* policy,
enforced only on requests the browser makes; a serverless function talking to
Nextcloud is server-side and faces **no CORS check at all** (same as curl or the
Node `webdav` client). The browser only ever calls our **same-origin**
`/api/nextcloud` function, so there is no cross-origin request to block, and the
target instance's missing CORS headers become irrelevant. The function is a thin
WebDAV relay: browser → same-origin function → the user's Nextcloud, forwarding
`GET`/`PUT`/`PROPFIND` and streaming the response back. This works against **any
instance the user has credentials for** — no admin rights, no server-side changes
on their Nextcloud.

Stateless, no DB — same shape as the Google functions: the client stores the
**Nextcloud URL + app password** (IndexedDB) and sends them per request; the
function just forwards.

Caveats to handle in the implementation:

- **User credentials pass through our function.** Require an **app-specific
  password** (Nextcloud → Security → Devices & sessions), never the account
  password — scoped and revocable — always over HTTPS.
- **SSRF risk** — the function fetches a **user-supplied URL**, so validate the
  target (scheme = https, block private/link-local IP ranges, ideally an
  allowlist). Non-optional for a public deployment.
- Serverless payload/timeout limits are a non-issue for sheet-sized data.
- Character data transits the relay (passes through, not stored) — worth telling
  users.

**Fallback — WebAppPassword.** If the proxy is blocked somehow (e.g. deployment
constraints, or we decide not to relay user credentials), fall back to requiring
the Nextcloud **admin** to install the **WebAppPassword** server app, which adds
the CORS headers to `/remote.php/dav` and issues scoped app passwords so the
browser can talk to WebDAV directly. It is browser-agnostic (a server app, not a
browser extension) but needs admin rights on the target instance, so it can't
support an arbitrary Nextcloud the user doesn't administer.

### Cross-provider abstraction libraries (why none fit cleanly)

- **Uppy** (`@uppy/*`) — popular, has Google Drive + OneDrive plugins, but it is
  **upload-into-your-app** oriented and its OAuth needs the **Companion** backend
  server; no Nextcloud save target.
- **remoteStorage.js** — built exactly for "connect once, sync silently" unhosted
  apps, but its backends are Google Drive + Dropbox only; no OneDrive, and the
  Nextcloud remoteStorage app is abandoned.

So the trusted path is MSAL + Graph SDK, GIS + Picker, and the `webdav` client,
wrapped in our own adapter, **plus the stateless serverless functions this section
assumes**: a Google code-exchange + refresh pair, a Microsoft refresh function
(confidential client), and the Nextcloud WebDAV proxy. Given those, the ideal UX
— pick once, then silent cross-browser save that survives long gaps — is
**achievable for all three of Google, OneDrive, and Nextcloud**. Without the
serverless layer, none of them reach durable silent auth.

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
