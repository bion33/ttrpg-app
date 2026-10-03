/**
 * Target-URL validation for the Nextcloud relay: a fail-closed hostname allowlist (NEXTCLOUD_ALLOWED_HOSTS) plus an
 * https requirement in production. No DNS or IP arithmetic — the check is a pure hostname string match.
 */

/** Raised when the relay is unconfigured in production (allowlist empty); the handler maps it to a 503. */
export class RelayNotConfiguredError extends Error {
    constructor(message = 'Relay not configured') {
        super(message)
        this.name = 'RelayNotConfiguredError'
    }
}

// The lowercased set of hostnames the relay may forward to, parsed from the comma-separated env var (empty when unset).
function allowedHosts(): Set<string> {
    const raw = process.env.NEXTCLOUD_ALLOWED_HOSTS ?? ''
    const hosts = raw.split(',').map((host) => host.trim().toLowerCase()).filter((host) => host !== '')
    return new Set(hosts)
}

/**
 * Validates a user-supplied WebDAV target against the allowlist: in production an empty allowlist refuses every forward
 * (fail closed) and https is required; a set allowlist is enforced in both modes; an unset allowlist allows any target
 * in development only. Returns the parsed URL or throws (RelayNotConfiguredError for the unconfigured-production case).
 */
export function assertAllowedTarget(raw: string): URL {
    let url: URL
    try {
        url = new URL(raw)
    } catch {
        throw new Error('Invalid target URL')
    }

    const production = process.env.NODE_ENV === 'production'
    const hosts = allowedHosts()

    if (production && hosts.size === 0) throw new RelayNotConfiguredError()
    if (production && url.protocol !== 'https:') throw new Error('Only https targets are allowed')
    // Development with no allowlist: any target is permitted so a local/http Nextcloud can be reached.
    if (hosts.size === 0) return url
    if (!hosts.has(url.hostname.toLowerCase())) throw new Error('Target host is not allowed')
    return url
}
