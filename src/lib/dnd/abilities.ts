/**
 * Pure D&D 5e ability-score math shared across sheets (the main character sheet's abilities and the character-info
 * companion block). No atoms, no React, no storage - just values in, values out - so every rule is unit-testable.
 */

/**
 * The D&D 5e ability modifier for an ability score.
 */
export function abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2)
}

/**
 * The ability modifier for a (possibly blank) base score and optional extra points, or null when both are blank.
 */
export function abilityModifierValue(score: number | null, extra: number | null = null): number | null {
    if (score === null && extra === null) return null
    return abilityModifier((score ?? 0) + (extra ?? 0))
}
