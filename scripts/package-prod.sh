#!/usr/bin/env bash
#
# Builds the client and packages client + server into a production tarball.
#
# The tarball holds the built static SPA (web/) and the server's source plus its
# install manifests — no node_modules and no .env secrets. Copy it to the target
# machine and extract; see the bundled DEPLOY.md for the steps there.
#
# Client VITE_* values (OAuth client ids and redirect URIs) are baked into web/ at
# BUILD time from the root .env.prod, so fill that in on THIS machine first. These
# values are public by design (they ship to the browser); the server's secrets are
# set separately in the server's own production environment.
#
# Usage: scripts/package-prod.sh [output-directory]   (default: ./build)

set -euo pipefail

# Resolve the repo root from this script's own location, independent of the caller's cwd.
script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_directory/.." && pwd)"
cd "$repo_root"

yarn="npx corepack@latest yarn"

output_directory="${1:-$repo_root/build}"
version="$(date +%Y%m%d-%H%M%S)"
artifact_name="ttrpg-app-prod-$version"

# The artifact's members (web/, server/, DEPLOY.md) are staged at the staging root so
# the tarball has no wrapping top-level directory — it extracts straight into pwd.
staging_directory="$(mktemp -d)"
trap 'rm -rf "$staging_directory"' EXIT

# The client build bakes VITE_* values into web/; they come from the root .env.prod
# (loaded by Vite for --mode prod), never from server/.env.
if [[ ! -f .env.prod ]]; then
  echo "error: .env.prod not found — create it (from .env.example) with the production VITE_* values" >&2
  exit 1
fi

echo "==> Building client (tsc -b && vite build --mode prod)"
$yarn build --mode prod

echo "==> Staging artifact"

# Client: the built static SPA (env already baked in).
cp -r dist "$staging_directory/web"

# Server: source and install manifests only — node_modules and .env are intentionally
# excluded (set the server's env in its production environment, not in this archive).
mkdir -p "$staging_directory/server"
cp -r server/src "$staging_directory/server/src"
cp server/package.json server/yarn.lock server/.yarnrc.yml server/tsconfig.json "$staging_directory/server/"
cp server/.env.example "$staging_directory/server/.env.example"

# Target-machine instructions.
cat > "$staging_directory/DEPLOY.md" <<'DEPLOY'
# Deploying this build

Extract the archive (it unpacks `web/`, `server/`, and this `DEPLOY.md` into the
current directory, with no wrapping folder):

```bash
tar -xzf ttrpg-app-prod-*.tar.gz
```

This archive contains:

- `web/` — the built static SPA. Serve it with any static file server / CDN.
  Client-side routing: fall back unknown paths to `index.html`.
- `server/` — the Hono storage/OAuth API (runs TypeScript directly via `tsx`).

The client expects the API same-origin at `/api/*` and the OAuth callbacks at
`/oauth/*`, so put a reverse proxy in front: serve `web/` statically and forward
`/api/*` (and `/oauth/*`) to the server process.

## 1. Server

```bash
cd server
npx corepack@latest yarn install --immutable
npx corepack@latest yarn start  # tsx src/index.ts, listens on $PORT (default 3000)
```

Set the server's env in its production environment (not shipped in this archive;
`.env.example` is the template):

- `APP_ORIGIN` — your production `https://…` origin.
- `NEXTCLOUD_ALLOWED_HOSTS` — required in production; the relay fails closed (503)
  when unset.
- `MS_*` / `GOOGLE_*` — OAuth client ids/secrets and the production `https://…`
  callback URIs (also add those URIs to the Entra / Google Cloud app registrations).

Run `yarn start` under a process manager (systemd, pm2, …) so it restarts on exit.

## 2. Reverse proxy (example: nginx)

```nginx
server {
    listen 443 ssl;
    server_name your.domain;

    root /path/to/web;
    location / {
        try_files $uri /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

TLS is required: the OAuth providers reject non-`https` redirect URIs off localhost.

## Note on client env

The `VITE_*` values were baked into `web/` when this archive was built. Changing
them means rebuilding on the build machine — they cannot be set here.
DEPLOY

echo "==> Creating tarball"
mkdir -p "$output_directory"
tarball="$output_directory/$artifact_name.tar.gz"
tar -czf "$tarball" -C "$staging_directory" web server DEPLOY.md

echo "==> Done: $tarball"
