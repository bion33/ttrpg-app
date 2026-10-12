/**
 * A fresh, opaque id (a GUID). Decoupled from any display name so it survives renames and stays a stable storage key —
 * used both as a binder's storage-prefix root and as a page's storage prefix.
 */
export function newId(): string {
    return crypto.randomUUID()
}

// Matches the canonical 8-4-4-4-12 hexadecimal GUID shape produced by `newId`.
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Whether a string is a GUID produced by `newId`, used to tell legacy GUID ids apart from the human-readable slugs
 * that replace them.
 */
export function isGuid(value: string): boolean {
    return GUID_PATTERN.test(value)
}
