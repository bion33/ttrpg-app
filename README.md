# What does this app do?

This app is a free, open-source tabletop role-playing game character app. It
lets you organise your characters into a library of binders, each holding a set
of pages. You choose which types of pages to add and how many. Pages include the
standard character sheets with interactive fields and markdown notes. You can
create your own reusable markdown templates, and binder templates with a
predefined set of pages in a particular order. The app runs entirely in your
browser, with no account required, and is intended for self or small-scale hosting.

Everything you create is saved in your browser's local storage on your own
device. You can optionally back up and sync a single snapshot of all your data to
a storage provider of your choice. This only ever happens when you explicitly use
or connect such a provider:

- **File (import / export)**: the snapshot is downloaded to, and loaded from, a
  file you pick on your device.
- **Nextcloud**: the snapshot is uploaded to the Nextcloud instance of the
  public share link you provide.
- **OneDrive**: the snapshot is stored in an app-specific folder of your own
  Microsoft OneDrive account.
- **Google Drive**: the snapshot is stored in an app-specific folder of your own
  Google Drive account.

For all cloud providers the credential/token is your own, stored in your browser. 
There is no analytics, tracking, or advertising, and your data is never stored, sold or 
shared with anyone beyond your browser and the storage providers you explicitly connect to.

## Run with Docker (dev)

`docker compose up` brings up three containers behind one origin: `proxy`
(nginx) publishes the app at **http://localhost:8080**, forwarding `/` to the
Vite dev server (`web`, with HMR through the proxy) and `/api/*` to the storage
api (`api`).

### Run it

From the repo root:

```bash
docker compose up
```

No manual steps are needed. First boot is slower — each container runs `corepack
enable && yarn install` — and nginx may return `502` for a few seconds until Vite
and the api are listening; that's expected, not a misconfiguration.

Copying `server/.env.example` → `server/.env` is **optional** in this phase
(`PORT` and `APP_ORIGIN` have defaults); it becomes required once OAuth lands.
Requires Docker Compose v2.24+ (for the `env_file: required: false` long form); on
older Compose, drop those two lines from `docker-compose.yml` and copy the `.env`.

### Test it

```bash
# same-origin health through the proxy (NOT the api port :3000 directly)
curl http://localhost:8080/api/health        # → ok
```

- Open **http://localhost:8080/** — the app renders.
- Edit any `src/*.tsx` file — the browser hot-reloads without a full refresh, and
  the console shows no CORS errors.

### Tear down

```bash
docker compose down        # stop the containers
docker compose down -v     # also drop the anonymous node_modules volumes
```

Use `down -v` after changing dependencies to force a clean reinstall (the
anonymous `node_modules` volumes can otherwise go stale). Docker is additive —
`yarn dev`, `yarn build`, `yarn lint`, and `yarn test` still run directly on the
host unchanged, so the container isn't needed for normal local work.

## Deploy to production

Docker Compose above is **dev only** (it runs `yarn dev` with HMR). For production,
`scripts/package-prod.sh` builds the client and bundles it with the server into a
tarball you copy to the target machine and extract.

### Build the artifact

```bash
# On the build machine. Create the root .env.prod FIRST — see the warning below.
scripts/package-prod.sh            # writes build/ttrpg-app-prod-<timestamp>.tar.gz
scripts/package-prod.sh /some/dir  # or choose the output directory
```

The tarball contains `web/` (the built static SPA), the `server/` source and its
install manifests, and a `DEPLOY.md` with the target-machine steps. It carries **no
secrets**: it excludes `node_modules` (installed on the target) and every `.env`
(the server's env is set in its production environment).

> **The client's `VITE_*` values are baked into `web/` at build time**, from the
> root `.env.prod` (Vite loads it for `--mode prod`; `server/.env` is never read for
> the client build). Create `.env.prod` from `.env.example` with the production OAuth
> client ids and `https://…` redirect URIs before running the script — it aborts if
> the file is missing. These values are public by design; they cannot be changed on
> the target without rebuilding.

### On the target machine

Extract the tarball, then follow its bundled `DEPLOY.md`. In short:

1. **Server** — in `server/`, `npx corepack@latest yarn install --immutable`, then
   run `yarn start` under a process manager (systemd, pm2, …), with the server's env
   (`APP_ORIGIN`, `NEXTCLOUD_ALLOWED_HOSTS`, the `MS_*` / `GOOGLE_*` OAuth
   credentials and `https://…` callback URIs) set in its production environment;
   `server/.env.example` is the template. It listens on `PORT` (default `3000`).
2. **Reverse proxy** — serve `web/` statically with an SPA fallback to
   `index.html`, and forward `/api/*` (and `/oauth/*`) to the server process. TLS is
   required: the OAuth providers reject non-`https` redirect URIs off localhost.
3. **OAuth registrations** — add the production `https://…/oauth/{microsoft,google}/callback.html`
   URIs to the Entra and Google Cloud app registrations (see Storage below for the
   dev URIs they sit alongside).

## Storage

Persistence is not per-field: the whole `localStorage` key space is snapshotted to
one JSON document (`ttrpg-app.json`) and hydrated back, behind a single storage-provider
interface. Every provider saves and loads that same whole-library snapshot.

| Provider  | Auth | Where the file lives | Path configurable? |
|---|---|---|---|
| File (import / export)  | none | a file you pick each save/load | **yes** |
| Nextcloud  | public share link (share token) | the shared folder (path within it) | **yes** |
| OneDrive | OAuth (Microsoft), least-privilege | the app's own OneDrive folder (`Apps/<app>/`) | **no** |
| Google Drive | OAuth (Google) | app data folder | **no** |

### Why Nextcloud lets you choose a path but OneDrive does not

This is a **security** difference, not an inconsistency, and it follows directly
from how each provider authenticates:

- **Nextcloud uses a public share link.** You create a public share of a folder
  (with create/edit/delete enabled) and the app holds only that share's token — never
  your username or account password. The share **is** the scope: the token can only
  ever touch the shared folder, so letting you name a path *within* it adds
  flexibility without widening access. You scope access by choosing which folder to
  share; the app never holds a credential to the rest of your Files.

- **OneDrive uses OAuth, which lets us request a *narrow* token.** We deliberately
  request only `Files.ReadWrite.AppFolder` — a scope confined to the application's
  own folder. With that scope the app **literally cannot** read or write the rest of
  your drive, even if it tried. Letting you point it at an arbitrary path in your
  drive would require the broad `Files.ReadWrite` scope (full-drive read/write),
  which we refuse to request. So OneDrive trades a configurable path for a token that
  can only ever touch its own sync file — the safer default, and the reason the file
  lives under `Apps/<app>/` rather than a location you choose.

The same principle applies to Google Drive: its app data folder is the
least-privilege equivalent, so it is likewise a fixed location.

For all cloud providers the credential/token is your own, stored device-locally
(cleared with site data), and never included in the synced snapshot. The File
provider remains the human-readable, cross-provider escape hatch.

### Connecting OneDrive (Microsoft Entra ID app registration)

OneDrive uses OAuth, so an app instance needs a one-time app registration before it can
connect. Do this once in the [Entra admin center](https://entra.microsoft.com) → **App registrations**.

1. **New registration.**
   - Supported account types: **Accounts in any organizational directory and personal
     Microsoft accounts** (personal accounts are what consumer OneDrive users have).
   - Redirect URI: platform **Web** (not SPA — the token exchange is a confidential-client
     call carrying the secret; PKCE is still sent), value `http://localhost:8080/oauth/microsoft/callback.html`. 
   - Add the production `https://…` callback URI to the same registration when deploying.
2. **Get Application (client) ID** (a GUID) from the registration's **Overview** page, and put it in:
   - `./.env`
   - `./server/.env`
3. **Client secret.** Certificates & secrets → New client secret → copy the **Value**
   immediately (shown once) and put it in `./server/.env`
4. **API permissions** → Microsoft Graph → **Delegated**: 
   - `Files.ReadWrite.AppFolder`
   - `offline_access` (refresh token)
   - `openid` (sign-in)

### Connecting Google Drive (Google Cloud OAuth client)

Like OneDrive, Google Drive uses OAuth, so an app instance needs a one-time setup before
it can connect. Do this once in the [Google Cloud Console](https://console.cloud.google.com).

1. **Create a project** (or reuse one)
2. In **APIs & Services > Library**, find Google Drive API and enable it.
3. **OAuth consent screen.**
   - User type: **External**
   - Add the scope `.../auth/drive.appdata`
4. **Credentials > Create credentials > OAuth client ID.**
   - Application type: **Web application**
   - **Authorized redirect URIs**: `http://localhost:8080/oauth/google/callback.html` (dev)
   - No "Authorized JavaScript origins" needed
5. **Copy the secret** from the created client and put it in `./server/.env`
   **Copy the client ID** from the created client and put them in:
   - `./.env`
   - `./server/.env`
6. **Publish the app**: in Audience, set publishing status to in production
