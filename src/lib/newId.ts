/**
 * A fresh, opaque id (a GUID). Decoupled from any display name so it survives renames and stays a stable storage key —
 * used both as a binder's storage-prefix root and as a page's storage prefix.
 */
export function newId(): string {
    return crypto.randomUUID()
}
