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
