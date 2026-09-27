/**
 * A fresh, opaque page id (a GUID). Decoupled from the page name so the id survives renames and stays a stable
 * storage key.
 */
export function pageId(): string {
    return crypto.randomUUID()
}
