/**
 * A fresh, opaque binder id (a GUID). Decoupled from the binder name so the id survives renames and stays a stable
 * storage-prefix root that all the binder's pages persist under.
 */
export function binderId(): string {
    return crypto.randomUUID()
}
