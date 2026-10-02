/**
 * Pure D&D 5e equipment rules math. No atoms, no React, no storage - just values in, values out - so every rule here
 * is unit-testable in isolation. Atoms merely wire these functions to field values (see layout/sections/header.ts).
 */

// Every coin weighs a fiftieth of a pound (50 coins to the pound) in D&D 5e.
const POUNDS_PER_COIN = 0.02

/**
 * The carrying capacity (in pounds) for a Strength score: 15 pounds per point of Strength.
 */
export function carryCapacity(strength: number): number {
    return strength * 15
}

/**
 * The total weight (in pounds) of a set of item weights, treating an empty (null) weight as zero.
 */
export function totalWeight(weights: Array<number | null>): number {
    return weights.reduce<number>((sum, weight) => sum + (weight ?? 0), 0)
}

/**
 * The weight (in pounds) of a coin purse: the summed coin count at 0.02 pounds per coin.
 */
export function coinWeight(coins: Array<number | null>): number {
    return totalWeight(coins) * POUNDS_PER_COIN
}

/**
 * The item count encoded in an item's text, or null when none: a trailing "| N" or a leading "N |" (the pipe optionally
 * followed/preceded by one space), e.g. "Arrows | 20" or "20 | Arrows". A trailing count wins over a leading one.
 */
export function parseItemCount(text: string): number | null {
    const trailing = text.match(/\| ?(\d+)$/)
    if (trailing) return Number(trailing[1])
    const leading = text.match(/^(\d+) ?\|/)
    if (leading) return Number(leading[1])
    return null
}

/**
 * The total weight (in pounds) of item rows whose count is encoded in the item text: each row's encoded count (or 1 when
 * none) times its per-item weight, empties as zero.
 */
export function totalItemWeight(rows: Array<{item: string; weight: number | null}>): number {
    return rows.reduce<number>((sum, row) => sum + (parseItemCount(row.item) ?? 1) * (row.weight ?? 0), 0)
}

/**
 * The total weight (in pounds) of stacked storage rows: each row's count times its per-item weight, empties as zero.
 */
export function totalStorageWeight(rows: Array<{count: number | null; weight: number | null}>): number {
    return rows.reduce<number>((sum, row) => sum + (row.count ?? 0) * (row.weight ?? 0), 0)
}

/**
 * The encumbrance message for a carry weight against a Strength score: the standard/variant levels past 5×, 10×, and 15×
 * Strength, or an empty string when unencumbered or Strength is unknown.
 */
export function encumbranceLabel(carryWeight: number, strength: number | null): string {
    if (strength === null) return ''
    if (carryWeight > 15 * strength) return 'Cannot move'
    if (carryWeight > 10 * strength) return 'Variant only: -20ft, disadvantage on STR, DEX and CON checks'
    if (carryWeight > 5 * strength) return 'Variant only: -10ft'
    return 'Unencumbered'
}
