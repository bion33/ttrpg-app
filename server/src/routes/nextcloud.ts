/**
 * Same-origin WebDAV relay: forwards one request to the user's Nextcloud, so the browser faces no cross-origin call.
 * Stateless and header-based — the browser builds the target URL and Basic-auth header; the server only validates and
 * forwards.
 */
import {Hono} from 'hono'
import {RelayNotConfiguredError, assertAllowedTarget} from '../security/ssrf.ts'

const ALLOWED_METHODS = new Set(['GET', 'PUT', 'PROPFIND', 'MKCOL', 'DELETE', 'MOVE'])

export const nextcloud = new Hono()

nextcloud.post('/', async (context) => {
  const target = context.req.header('x-nc-url')
  const authorization = context.req.header('authorization') // Basic user:appPassword, built client-side
  const method = (context.req.header('x-nc-method') ?? 'GET').toUpperCase()

  if (!target || !authorization) return context.text('Missing target URL or credentials', 400)
  if (!ALLOWED_METHODS.has(method)) return context.text('Method not allowed', 405)

  let url: URL
  try {
    url = assertAllowedTarget(target)
  } catch (error) {
    if (error instanceof RelayNotConfiguredError) return context.text(error.message, 503)
    return context.text((error as Error).message, 400)
  }

  const headers: Record<string, string> = {authorization}
  const depth = context.req.header('depth')
  if (depth) headers.depth = depth
  const contentType = context.req.header('content-type')
  if (contentType) headers['content-type'] = contentType

  const body = method === 'GET' ? undefined : await context.req.arrayBuffer()
  const upstream = await fetch(url, {method, headers, body, redirect: 'manual'})

  // The allowlist validates only the initial URL, so a 3xx could escape it; WebDAV needs no redirects, so reject them.
  if (upstream.status >= 300 && upstream.status < 400) return context.text('Target redirected', 502)

  const responseHeaders = new Headers()
  const upstreamType = upstream.headers.get('content-type')
  if (upstreamType) responseHeaders.set('content-type', upstreamType)
  return new Response(upstream.body, {status: upstream.status, headers: responseHeaders})
})
