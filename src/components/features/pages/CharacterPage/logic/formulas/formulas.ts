/**
 * Pure D&D 5e rules math. No atoms, no React, no storage - just values in,
 * values out - so every rule here is unit-testable in isolation. Atoms merely
 * wire these functions to field values (see layout/sections/abilities.ts).
 */

/**
 * The D&D 5e ability modifier for an ability score.
 */
export function abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2)
}

/**
 * The D&D 5e skill (or saving-throw) bonus for an ability modifier, given proficiency and expertise.
 */
export function skillBonus(modifier: number, proficiencyBonus: number, proficient: boolean, expertise: boolean): number {
    if (!proficient) return modifier
    return modifier + (expertise ? proficiencyBonus * 2 : proficiencyBonus)
}

/**
 * Formats a modifier with an explicit leading sign.
 */
export function formatModifier(modifier: number): string {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

/**
 * The D&D 5e passive Perception score: 10 plus the creature's Perception check modifier.
 */
export function passivePerception(perceptionModifier: number): number {
    return 10 + perceptionModifier
}

/**
 * The D&D 5e climb/swim speed derived from a walking speed: half of it, rounded down.
 */
export function halfSpeed(walkingSpeed: number): number {
    return Math.floor(walkingSpeed / 2)
}
