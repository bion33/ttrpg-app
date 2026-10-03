/**
 * Formats a number with an explicit leading sign (e.g. a modifier "+3" or "-1"); zero is "+0".
 */
export function formatModifier(modifier: number): string {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`
}
