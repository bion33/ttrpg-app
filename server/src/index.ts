/**
 * Storage api service: the same-origin `/api/*` backend later phases extend with relay/OAuth routes.
 * Phase 2 exposes only a CORS lock and a health route.
 */
import {serve} from '@hono/node-server'
import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {nextcloud} from './routes/nextcloud.ts'
import {oauth} from './routes/oauth.ts'

const app = new Hono()

// Same-origin in production via the proxy; the lock matters if the api is reached directly.
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
