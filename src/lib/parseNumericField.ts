/**
 * Parses a raw field string to a number, or null when it is blank or not a number.
 */
export function parseNumericField(raw: string): number | null {
    const trimmed = raw.trim()
    if (trimmed === '') return null
    const value = Number(trimmed)
    return Number.isNaN(value) ? null : value
}
