/**
 * A binder's remembered active page id, parsed from the raw JSON persisted under its `${prefix}:activePage` key, so the
 * library can reopen the binder at the page the user last viewed. Returns an empty id for missing or malformed data.
 */
export function activePage(raw: string | null): string {
    if (!raw) return ''
    try {
        const id = JSON.parse(raw)
        return typeof id === 'string' ? id : ''
    } catch {
        return ''
    }
}
