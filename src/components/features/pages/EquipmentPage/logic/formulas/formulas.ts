/**
 * Pure D&D 5e equipment rules math. No atoms, no React, no storage - just values in, values out - so every rule here
 * is unit-testable in isolation. Atoms merely wire these functions to field values (see layout/sections/header.ts).
 */

/**
 * The carrying capacity (in pounds) for a Strength score: 15 pounds per point of Strength.
 */
export function carryCapacity(strength: number): number {
    return strength * 15
}
