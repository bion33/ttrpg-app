/**
 * A case-insensitive comparator for items carrying a display label, so lists and dropdowns show names in natural
 * order. Pass to `Array.prototype.sort`.
 */
export function compareByLabel(first: { label: string }, second: { label: string }): number {
    return first.label.localeCompare(second.label, undefined, {sensitivity: 'base'})
}
