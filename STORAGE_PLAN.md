# Storage Plan — durable, cross-browser character persistence

Concrete implementation plan for giving the app durable persistence beyond
`localStorage`, following the "Cloud providers" avenue in
[STORAGE_ANALYSIS.md](./STORAGE_ANALYSIS.md). Read that file if necessary for the
research and trade-offs. This file is the concrete build plan.

## Scope

Four persistence targets, all behind one adapter interface:

1. **Nextcloud** — WebDAV, via a same-origin relay function (CORS).
2. **OneDrive** — Microsoft Graph, auth-code/PKCE + confidential-client exchange/refresh functions.
3. **Google Drive** — Drive v3 REST, GIS auth + code-exchange/refresh functions.
4. **File import/export** — a real on-disk file the user picks **each** read and
   write (no silent repeat; `showSaveFilePicker` on Chromium, download fallback on
   Firefox).

Assumed available (per the analysis): a small set of **stateless API functions**,
**self-hosted** alongside the static app (see [Deployment](#deployment--local-development)).
They hold no session and no database; the browser keeps its own tokens/credentials
and passes them per request. A reverse proxy puts the app and the functions on **one
origin**, so `/api/*` is same-origin (kills the Nextcloud CORS problem).

The three cloud targets aim for the ideal UX: **connect once, then a Save button
writes silently**. The file target is deliberately manual.

## What "a save" actually is

The whole app state lives in `localStorage` keys (`jotai` `atomWithStorage`):

- `binders` — the library's binder list.
- `${binderId}:pages`, `${binderId}:activePage` — per binder.
- `${binderId}:${pageId}:<fieldId>` — every field value on every sheet.
- App view state (`location`, `pageScale`) — **also synced**, so a reopened
  document restores the same open binder/page and zoom.

So persistence is not per-field plumbing: it is **snapshot the whole `localStorage`
key space to one JSON document, and hydrate it back**. This keeps the sync layer
entirely decoupled from the field-node system — no changes to `fieldNodes.ts`,
sections, or formulas.

### Snapshot / hydrate module — `src/lib/snapshot.ts` (pure, unit-tested)

```ts
interface LibrarySnapshot {
  version: number;            // schema version the entries conform to
  revision: string;           // GUID minted at each save; identifies THIS exact saved state
  savedAt: string;            // ISO timestamp (human info only, never used for conflict logic)
  entries: Record<string, string>;  // localStorage key -> raw JSON string value
}

function createSnapshot(storage: StorageLike): LibrarySnapshot   // reads every key, stamps CURRENT_VERSION
function applySnapshot(storage: StorageLike, snap: LibrarySnapshot): void  // migrates, then writes
```

- Pure functions over a `StorageLike` (inject `window.localStorage`; test with a
  fake), matching the repo's logic-vs-layout rule.
- The whole `localStorage` key space is synced (including `location`/`pageScale`);
  no key filtering.
- `applySnapshot` first migrates the snapshot up to `CURRENT_VERSION` (below), then
  clears existing keys and writes the migrated entries, so a load is a replace, not
  a merge. After applying, the app must re-read atoms — see UI notes.

### Migrations — `src/lib/migrations.ts` (pure, unit-tested)

A **simplistic ordered list**: each migration declares the version it produces and
transforms the `entries` map. On load, every migration newer than the snapshot's
`version` runs in order, so an old document is brought forward before it is applied.

```ts
interface Migration {
  to: number;   // the schema version this migration produces (from = to - 1)
  migrate(entries: Record<string, string>): Record<string, string>;
}

// Append-only, sorted ascending by `to`. Never edit or renumber an existing entry.
const MIGRATIONS: Migration[] = [
  // { to: 2, migrate: (entries) => ({ ...entries, /* rename/reshape keys */ }) },
];

const CURRENT_VERSION = MIGRATIONS.reduce((max, m) => Math.max(max, m.to), 1);

/**
 * Brings a snapshot up to CURRENT_VERSION by applying, in order, every migration newer than its version.
 */
function migrateSnapshot(snap: LibrarySnapshot): LibrarySnapshot {
  if (snap.version > CURRENT_VERSION) throw new Error('Snapshot is from a newer app version')
  let entries = snap.entries
  for (const migration of MIGRATIONS) {
    if (migration.to > snap.version) entries = migration.migrate(entries)
  }
  return {...snap, version: CURRENT_VERSION, entries}
}
```

- **Rules:** migrations are append-only and pure (entries in → entries out); each
  step assumes the shape its predecessor produced. `createSnapshot` stamps
  `CURRENT_VERSION`; a version **newer** than we understand is rejected (don't
  silently corrupt newer data).
- To change the key layout, add one `Migration`; `CURRENT_VERSION` derives itself,
  so nothing else needs bumping.

## Adapter interface — `src/lib/storage/StorageProvider.ts`

One interface all four targets implement:

```ts
interface StorageTarget {         // an opaque, serialisable handle to "where"
  provider: 'nextcloud' | 'onedrive' | 'googleDrive' | 'file';
  locator: string;                // WebDAV path | Graph item id | Drive file id | filename
  label: string;                  // shown in the UI
}

interface StorageProvider {
  readonly id: StorageTarget['provider'];
  connect(): Promise<void>;                 // auth / no-op for file
  isConnected(): boolean;
  pick(): Promise<StorageTarget>;           // choose/create the target document
  save(target: StorageTarget, snap: LibrarySnapshot): Promise<void>;
  load(target: StorageTarget): Promise<LibrarySnapshot | null>;  // null = no document there
  readRevision(target: StorageTarget): Promise<string | null>;   // cheap remote-revision probe; null = absent
  disconnect(): Promise<void>;
}
```

`readRevision` lets the app detect a divergence **before** downloading/applying:
use the provider's native version tag where cheap (Nextcloud `PROPFIND` ETag, Drive
file `version`, Graph `cTag`), else fall back to a `load()` and read its `revision`
field (sheet-sized, so a full fetch is acceptable). The **file** provider can't
probe — the user hands us a file, so its revision is read from the file itself at
import time.

The active `StorageTarget`, per-provider credentials/tokens, and the **sync state
below** persist in **IndexedDB** (not `localStorage`, to keep them out of the
snapshot and to hold token objects), via **`idb-keyval`**; a tiny
`src/lib/storage/connectionStore.ts` is the typed wrapper over it.

A `useStorage()` hook exposes `connect / pick / save / load / status` to the UI and
owns the sync state and the `evaluateSync` decision below.

## Sync state & conflict detection — `src/lib/storage/sync.ts` (pure, unit-tested)

Two timestamps **cannot** answer "did the remote change underneath edits I've made
since I last synced?" — you can't tell whether the remote save is an *ancestor* of
the local state or a *divergent* branch. We need lineage, not clocks.

**Model.** Every saved snapshot carries a unique `revision` GUID (minted by
`newId()` on each save). The app remembers, per target, the revision its **local
state descends from**:

```ts
interface SyncState {
  baseRevision: string | null;  // revision we last loaded or saved for this target; null = never synced it
  baseHash: string | null;      // hash of the entries at that base moment
}
```

- **`baseRevision`** is set to the remote `revision` after a successful load, and to
  the newly minted `revision` after a successful save. It is the common ancestor.
- **Dirty** is derived, not a sticky flag: `dirty = hash(createSnapshot().entries)
  !== baseHash`. Robust against missed writes; a change-then-revert reads clean,
  which is fine. (`baseHash === null` — never synced this target — counts as dirty
  iff the local library has any data.)

**Decision (pure).** Compare the **remote** revision (from `readRevision`) to
`baseRevision`, combined with `dirty`:

```ts
type SyncStatus =
  | 'upToDate'       // remote === base, clean          -> save no-op, load no-op
  | 'localAhead'     // remote === base, dirty          -> MUST allow save; load would lose local edits
  | 'remoteAhead'    // remote !== base, clean          -> MUST allow load; save would clobber the other device
  | 'diverged'       // remote !== base, dirty          -> CONFLICT: warn, user chooses keep-local or take-remote
  | 'noRemote'       // remote absent                   -> save creates it; nothing to load
  | 'remoteMissing'  // had a base, remote now gone     -> warn (deleted elsewhere); may re-save to recreate

function evaluateSync(input: {
  remoteRevision: string | null;   // null = no remote document
  baseRevision: string | null;     // null = never synced this target
  dirty: boolean;
}): SyncStatus
```

**Full truth table** (every combination — the basis for the test suite):

| remoteRevision | baseRevision | dirty | status | Save | Load |
|---|---|---|---|---|---|
| absent | null | false | `noRemote` | creates (no-op if empty) | — |
| absent | null | true | `noRemote` | **creates** | — |
| absent | set | any | `remoteMissing` | re-save to recreate | — (warn: gone) |
| set | null | false | `remoteAhead` | blocked | **load** |
| set | null | true | `diverged` | via choice | via choice (**warn**) |
| set | == base | false | `upToDate` | no-op | no-op |
| set | == base | true | `localAhead` | **save** | blocked (would lose edits) |
| set | != base | false | `remoteAhead` | blocked | **load** |
| set | != base | true | `diverged` | via choice | via choice (**warn**) |

These cover the user's four scenarios: *old-loaded/clean/new-exists* = `remoteAhead`
(must load, may not save); *old-loaded/dirty/new-exists* = `diverged` (warn, choose);
*new-loaded/clean/new-exists* = `upToDate` (neither); *new-loaded/dirty/same-remote*
= `localAhead` (must save).

**Conflict resolution (`diverged`).** No auto-merge — it's a whole-library
snapshot. The warning modal offers exactly two outcomes, each showing both
`savedAt`s to orient the user:
- **Keep this device** → save local (mint new revision, overwrite remote), then
  `base := new revision`.
- **Take other device** → load remote, then `base := remote revision` (local edits
  discarded).

**After every successful save/load**, update `SyncState` (`baseRevision`,
`baseHash`) so the next decision starts from the new common ancestor.

**Tests.** `sync.test.ts` asserts `evaluateSync` for **every row above**, plus
resolution transitions (post keep-local and post take-remote both land at
`upToDate`), and the `baseHash === null` dirty derivation. Snapshot round-trips and
migrations keep their own tests.

## Per-provider implementation

### Nextcloud

- **Auth:** user supplies instance URL + **app password** (Security → Devices &
  sessions). Stored in IndexedDB. Optionally Login Flow v2 later.
- **Transport:** browser only ever calls our same-origin `/api/nextcloud` proxy
  (CORS is a non-issue). The function forwards `PROPFIND`/`GET`/`PUT` to the
  user's instance, passing URL + app password per request, streaming the reply.
- **Picker:** no native picker — a small folder browser using `PROPFIND`, or just
  let the user type/confirm a path. `locator` = WebDAV path (e.g.
  `/remote.php/dav/files/<user>/dnd/library.json`).
- **save/load:** `PUT` / `GET` file contents through the relay (browser sends the
  target URL + `Authorization: Basic` header per request).
- **Function:** `/api/nextcloud` — thin authenticated relay. **Must** validate the
  target URL (https only, block private/link-local ranges → SSRF).

### OneDrive

- **Auth:** browser runs the **authorization-code + PKCE** redirect to get a code
  (scopes `Files.ReadWrite offline_access`); it then posts the code to our
  `/api/oauth/microsoft/exchange` function. A pure-SPA MSAL flow won't do here —
  Microsoft caps SPA refresh tokens at 24h — so the exchange/refresh run
  **server-side as a confidential client** (client secret), symmetric to Google.
- **Picker:** OneDrive File Picker SDK v8 → `locator` = Graph item id.
- **save/load:** `PUT /me/drive/items/{id}/content`, `GET …/content` via
  `@microsoft/microsoft-graph-client`, using the short-lived access token.
- **Functions:** `/api/oauth/microsoft/exchange` (code → access + refresh) and
  `/api/oauth/microsoft/refresh` (refresh → access). Client stores its own refresh
  token and calls refresh when the access token expires.

### Google Drive

- **Auth:** Google Identity Services for interactive consent; **authorization-code
  flow with `access_type=offline`** for a refresh token.
- **Picker:** Google Picker API → `locator` = Drive file id.
- **save/load:** `files.get?alt=media` (load), `files.update` media `PATCH` (save).
- **Functions:** `/api/oauth/google/exchange` (code → access + refresh) and
  `/api/oauth/google/refresh` (refresh → access). Client stores its own refresh token.
  The browser's authorize request must send `access_type=offline&prompt=consent` to
  get a refresh token.
- **Caveat:** publish the OAuth consent screen — "testing" expires refresh tokens
  after 7 days.

### File import/export

- **Export:** `createSnapshot` → JSON → `showSaveFilePicker` (Chromium) or an
  anchor download (Firefox). User picks location each time.
- **Import:** `showOpenFilePicker` / `<input type=file>` → parse → `applySnapshot`.
- No connection, no API function, no persisted handle. Always available; also the
  cross-device escape hatch for the cloud providers.

## API functions (source)

All stateless, no DB; the client holds its own tokens/credentials and passes them
per request. Built as one tiny [Hono](https://hono.dev) app run under `tsx` (so
`.ts` files run directly, matching the main repo's extensioned imports), served
behind the reverse proxy at `/api/*`.

| Route | Purpose |
|---|---|
| `POST /api/nextcloud` | Same-origin WebDAV relay (SSRF-guarded) |
| `POST /api/oauth/:provider/exchange` | Auth code → access + refresh token (google, microsoft) |
| `POST /api/oauth/:provider/refresh` | Refresh token → access token (google, microsoft) |
| `GET /api/health` | Liveness for compose healthcheck |

Layout:

```
server/
  package.json
  Dockerfile
  .env.example
  src/
    index.ts        # Hono app: CORS lock, route mounting, listen
    env.ts          # required-env accessor
    oauth.ts        # google + microsoft code-exchange and refresh
    nextcloud.ts    # WebDAV relay
    ssrf.ts         # target-URL validation
```

### `server/src/env.ts`

```ts
/**
 * Reads a required environment variable, or a fallback; throws if neither is set.
 */
export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined) throw new Error(`Missing required env var: ${name}`)
  return value
}
```

### `server/src/ssrf.ts`

```ts
import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'

const PRIVATE_V4 = [
  /^0\./, /^10\./, /^127\./, /^169\.254\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
]

function isPrivateV4(address: string): boolean {
  return PRIVATE_V4.some((range) => range.test(address))
}

function isPrivateV6(address: string): boolean {
  const value = address.toLowerCase()
  return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80')
}

/**
 * Validates a user-supplied WebDAV URL. In production: https only, host not localhost/private/link-local.
 * In development the checks are skipped so a local/http Nextcloud can be targeted.
 */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Invalid target URL')
  }
  if (process.env.NODE_ENV !== 'production') return url

  if (url.protocol !== 'https:') throw new Error('Only https targets are allowed')
  if (url.hostname === 'localhost') throw new Error('Target host is blocked')

  const family = isIP(url.hostname)
  const addresses = family
    ? [{address: url.hostname, family}]
    : await lookup(url.hostname, {all: true})
  for (const {address, family: addressFamily} of addresses) {
    if (addressFamily === 4 && isPrivateV4(address)) throw new Error('Target resolves to a private address')
    if (addressFamily === 6 && isPrivateV6(address)) throw new Error('Target resolves to a private address')
  }
  return url
}
```

### `server/src/nextcloud.ts`

```ts
import {Hono} from 'hono'
import {assertPublicHttpsUrl} from './ssrf.ts'

const ALLOWED_METHODS = new Set(['GET', 'PUT', 'PROPFIND', 'MKCOL', 'DELETE', 'MOVE'])

/**
 * Same-origin WebDAV relay: forwards one request to the user's Nextcloud, so the browser faces no cross-origin call.
 */
export const nextcloud = new Hono()

nextcloud.post('/', async (context) => {
  const target = context.req.header('x-nc-url')
  const authorization = context.req.header('authorization') // Basic user:appPassword, built client-side
  const method = (context.req.header('x-nc-method') ?? 'GET').toUpperCase()

  if (!target || !authorization) return context.text('Missing target URL or credentials', 400)
  if (!ALLOWED_METHODS.has(method)) return context.text('Method not allowed', 405)

  let url: URL
  try {
    url = await assertPublicHttpsUrl(target)
  } catch (error) {
    return context.text((error as Error).message, 400)
  }

  const headers: Record<string, string> = {authorization}
  const depth = context.req.header('depth')
  if (depth) headers.depth = depth
  const contentType = context.req.header('content-type')
  if (contentType) headers['content-type'] = contentType

  const body = method === 'GET' ? undefined : await context.req.arrayBuffer()
  const upstream = await fetch(url, {method, headers, body})

  const responseHeaders = new Headers()
  const upstreamType = upstream.headers.get('content-type')
  if (upstreamType) responseHeaders.set('content-type', upstreamType)
  return new Response(upstream.body, {status: upstream.status, headers: responseHeaders})
})
```

### `server/src/oauth.ts`

```ts
import {Hono} from 'hono'
import type {Context} from 'hono'
import {env} from './env.ts'

interface ProviderConfig {
  tokenEndpoint: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

function configFor(provider: string): ProviderConfig {
  if (provider === 'google') {
    return {
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      clientId: env('GOOGLE_CLIENT_ID'),
      clientSecret: env('GOOGLE_CLIENT_SECRET'),
      redirectUri: env('GOOGLE_REDIRECT_URI'),
    }
  }
  if (provider === 'microsoft') {
    return {
      tokenEndpoint: `https://login.microsoftonline.com/${env('MS_TENANT', 'common')}/oauth2/v2.0/token`,
      clientId: env('MS_CLIENT_ID'),
      clientSecret: env('MS_CLIENT_SECRET'),
      redirectUri: env('MS_REDIRECT_URI'),
    }
  }
  throw new Error('Unknown provider')
}

async function forwardTokenRequest(context: Context, config: ProviderConfig, params: URLSearchParams) {
  params.set('client_id', config.clientId)
  params.set('client_secret', config.clientSecret)

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: params,
  })
  const data = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    return context.json({error: data.error ?? 'token_error', detail: data.error_description}, 400)
  }
  return context.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  })
}

/**
 * Confidential-client OAuth token endpoints (exchange + refresh) for Google and Microsoft.
 */
export const oauth = new Hono()

oauth.post('/:provider/exchange', async (context) => {
  let config: ProviderConfig
  try {
    config = configFor(context.req.param('provider'))
  } catch {
    return context.text('Unknown provider', 404)
  }
  const {code, codeVerifier} = await context.req.json<{code?: string; codeVerifier?: string}>()
  if (!code || !codeVerifier) return context.text('Missing code or codeVerifier', 400)

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: config.redirectUri,
  })
  return forwardTokenRequest(context, config, params)
})

oauth.post('/:provider/refresh', async (context) => {
  let config: ProviderConfig
  try {
    config = configFor(context.req.param('provider'))
  } catch {
    return context.text('Unknown provider', 404)
  }
  const {refreshToken} = await context.req.json<{refreshToken?: string}>()
  if (!refreshToken) return context.text('Missing refreshToken', 400)

  const params = new URLSearchParams({grant_type: 'refresh_token', refresh_token: refreshToken})
  return forwardTokenRequest(context, config, params)
})
```

### `server/src/index.ts`

```ts
import {serve} from '@hono/node-server'
import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {nextcloud} from './nextcloud.ts'
import {oauth} from './oauth.ts'

const app = new Hono()

// Same-origin in production via the proxy; the lock matters if the API is reached directly.
app.use('/api/*', cors({
  origin: process.env.APP_ORIGIN ?? '*',
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['content-type', 'authorization', 'x-nc-url', 'x-nc-method', 'depth'],
}))

app.get('/api/health', (context) => context.text('ok'))
app.route('/api/nextcloud', nextcloud)
app.route('/api/oauth', oauth)

const port = Number(process.env.PORT ?? 3000)
serve({fetch: app.fetch, port})
console.log(`storage-api listening on :${port}`)
```

### `server/package.json`

```json
{
  "name": "dnd-storage-api",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "hono": "^4.6.0",
    "tsx": "^4.19.0"
  }
}
```

### `server/.env.example`

```dotenv
PORT=3000
APP_ORIGIN=http://localhost:8080

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8080/oauth/google/callback

MS_TENANT=common
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_REDIRECT_URI=http://localhost:8080/oauth/microsoft/callback
```

## Deployment — local development

This section defines the **local dev** setup only. **Production is the admin's
responsibility**; they use this as documentation and pick their own hostname, ports,
TLS, and proxy/image. What production must preserve about the *functions themselves*
is called out under [Production levers](#production-levers) — the surrounding dev
infra (nginx, Vite dev server, source mounts, HMR) is dev-specific and differs in
production.

The dev setup is three containers behind one origin (`http://localhost:8080`), so
`/api/*` is same-origin without CORS pain:

- **proxy** — nginx, routes `/` to the Vite dev server (with HMR websocket) and
  `/api/` to the api container.
- **web** — `yarn dev` (Vite, HMR), source mounted.
- **api** — `npm run dev` (`tsx watch`), source mounted, **`NODE_ENV=development`**
  (so `assertPublicHttpsUrl` relaxes and a local/http Nextcloud can be targeted).

Nothing is stored server-side; both app containers use the official `node` image
with a mounted source tree, so no dev Dockerfiles are needed.

### `nginx.dev.conf` (repo root)

```nginx
events {}
http {
  server {
    listen 80;

    location /api/ {
      proxy_pass http://api:3000;
      proxy_set_header Host $host;
    }

    location / {
      proxy_pass http://web:5173;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;    # Vite HMR websocket (dev-only)
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
    }
  }
}
```

### `docker-compose.yml` (repo root — dev)

```yaml
services:
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx.dev.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - web
      - api

  web:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "yarn install && yarn dev --host 0.0.0.0"
    environment:
      NODE_ENV: development
    volumes:
      - ./:/app

  api:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "npm install && npm run dev"
    environment:
      NODE_ENV: development
      PORT: "3000"
    env_file: ./server/.env
    volumes:
      - ./server:/app
```

Run: copy `server/.env.example` → `server/.env`, fill the OAuth client
ids/secrets, then `docker compose up`. App on `http://localhost:8080`; edits to app
or `server/` source hot-reload.

> Vite must accept the proxied host — run with `--host` (above) and, if HMR can't
> connect through the proxy, set `server.hmr.clientPort = 8080` in `vite.config.ts`.

### Production levers

What the admin changes for the **functions** (everything else — nginx, image
choices, HMR, source mounts — is dev-only and replaced by their own infra):

- **`NODE_ENV=production`** on the api container — turns on the SSRF guard
  (https-only, block localhost/private ranges) in `assertPublicHttpsUrl`.
- **`APP_ORIGIN`** — set to the real public origin so the CORS lock matches it
  (dev uses `http://localhost:8080`).
- **OAuth env** — production client ids/secrets and **redirect URIs registered to
  the production origin (https)**; inject secrets from the platform's secret store,
  never a committed `.env`.
- **Secure context** — OAuth requires HTTPS; the admin terminates TLS at their
  proxy. The one invariant to keep: the app and `/api/*` stay **same-origin**.
- The api container is otherwise production-ready unchanged: run `npm start`
  (`tsx src/index.ts`) instead of the `dev` watch; it is stateless, no DB.
- The static app ships as a **built bundle** (`yarn build` → serve `dist/`), not the
  Vite dev server.

## UI / UX

- **Placement:** a storage control cluster sits **underneath the "Back to
  library" button** (the top-left corner cluster in `TabControls`), so it is
  present across binders/pages.
- **Storage settings** (new modal, opened from that cluster): pick a provider,
  connect, choose the target document, disconnect.
- **Connect dialogs must disclose the security terms** relevant to each provider,
  in the modal itself — not buried in docs:
  - Nextcloud: state **use an app password, never your account password**, and that
    the URL + app password and character data **pass through this app's relay**.
  - Google/OneDrive: state which account is being connected and that a token is
    stored in the browser (cleared with site data).
- **Buttons reflect `SyncStatus`** (from `evaluateSync`, re-checked via
  `readRevision` on focus/interval and after edits): Save enabled on `localAhead` /
  `noRemote` / `remoteMissing`; Load enabled on `remoteAhead`; on `diverged` both
  route through the conflict modal; on `upToDate` both idle. Show saving / saved /
  error / conflict state.
- **Load button:** in that cluster, **above the Save button**; see Load behaviour.
- **Save button:** in that cluster, under the Load button. Calls
  `save(target, createSnapshot())` then updates sync state. (Cluster order
  top→bottom: settings, Load, Save.)
- **Library (grid) view:** the library has no "Back to library" button, so its
  storage cluster (settings + Load, and Save when applicable) sits in the
  **bottom-right corner** instead.
- **Conflict modal (`diverged`):** shows both `savedAt`s and offers **Keep this
  device** (save, overwrite remote) or **Take other device** (load, discard local);
  see [conflict resolution](#sync-state--conflict-detection--srclibstoragesyncts-pure-unit-tested).
- **Autosave:** debounce a save after field changes once a cloud target is
  connected — but only when `evaluateSync` is `localAhead`/`noRemote`; a `diverged`
  result suppresses autosave and surfaces the conflict modal instead (built in phase
  6 — see [Phased delivery](#phased-delivery)).
- **Load behaviour:** loading applies the fetched snapshot. After `applySnapshot`,
  remount the affected React tree (e.g. bump a top-level `key`) so atoms re-read from
  the updated `localStorage` — `atomWithStorage` won't otherwise notice a bulk
  external write. A load over local edits (`diverged`) is only reachable through the
  conflict modal's explicit choice.

## Data format

- **One whole-library document** (`library.json`). Save/load and import/export are
  **always the full library snapshot** — no per-binder granularity. Simplest, and
  matches "Save saves everything".

## Security notes

- Nextcloud: **app password only**, never the account password; HTTPS only; the
  proxy validates target URLs (SSRF). These terms are surfaced in the connect
  dialog itself (see UI / UX).
- Tokens/credentials in IndexedDB are the user's own, scoped, and cleared with
  site data — acceptable, and kept out of the synced snapshot.
- Character data transits the Nextcloud relay (forwarded, not stored) — disclosed
  in the connect dialog itself (see UI / UX).

## Phased delivery

1. **Snapshot layer + migrations + sync/conflict logic + adapter interface +
   connection store + Storage settings UI + Save/Load buttons + conflict modal,
   wired to the file provider.** One shippable, user-testable slice: a full
   import/export flow through the real UI, proving
   `createSnapshot`/`applySnapshot`/`migrateSnapshot`/`evaluateSync` and the
   `StorageProvider` contract end to end (ship the empty `MIGRATIONS` list at
   `CURRENT_VERSION` 1). The file provider exercises the whole conflict matrix
   (revision lives in the file), so it is testable before any cloud/auth work. No
   API functions, no auth.
2. **Dev Docker/nginx scaffold + api container** (health route only), so later
   phases have somewhere to add functions.
3. **Nextcloud** (relay function + WebDAV adapter).
4. **OneDrive** (auth-code/PKCE + exchange/refresh functions + Graph adapter + File Picker).
5. **Google Drive** (GIS + exchange/refresh functions + Drive adapter + Picker).
6. **Autosave** (debounced) across the cloud providers.

## Decisions settled during planning

- **Conflict handling:** revision-lineage model, not last-write-wins — see
  [Sync state & conflict detection](#sync-state--conflict-detection--srclibstoragesyncts-pure-unit-tested).
- **`baseHash`:** a small non-crypto hash over the serialised entries (integrity,
  not security) — any stable one; decided at implementation, not a blocker.
