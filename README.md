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

## Storage

Persistence is not per-field: the whole `localStorage` key space is snapshotted to
one JSON document (`ttrpg-app.json`) and hydrated back, behind a single storage-provider
interface. Every provider saves and loads that same whole-library snapshot.

| Provider  | Auth | Where the file lives | Path configurable? |
|---|---|---|---|
| File (import / export)  | none | a file you pick each save/load | **yes** |
| Nextcloud  | app password (Basic) | anywhere in your Nextcloud Files | **yes** |
| OneDrive | OAuth (Microsoft), least-privilege | the app's own OneDrive folder (`Apps/<app>/`) | **no** |
| Google Drive | OAuth (Google) | app data folder | **no** |

### Why Nextcloud lets you choose a path but OneDrive does not

This is a **security** difference, not an inconsistency, and it follows directly
from how each provider authenticates:

- **Nextcloud uses a Basic-auth app password.** That credential is already
  all-or-nothing for your account's Files — it can read and write anywhere you can.
  Restricting the app to a fixed path would add **no** security (the credential
  itself grants full access regardless), so the app lets you name any path and keep
  your sync file wherever you like. You scope access by scoping the app password on
  the server; the app never holds more than that one credential.

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
