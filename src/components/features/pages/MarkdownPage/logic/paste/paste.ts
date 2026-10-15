/**
 * Decides whether a clipboard paste should be reparsed as markdown, and with what text. Returns the plain-text payload
 * to insert via the markdown content type, or null to defer to the editor's default paste. Defers when a richer
 * `text/html` payload exists (the source was already formatted, so its HTML parses cleanly) or the text is blank.
 */
export function markdownPasteText(clipboardTypes: readonly string[], plainText: string): string | null {
    if (clipboardTypes.includes('text/html')) return null
    if (plainText.trim() === '') return null
    return plainText
}
