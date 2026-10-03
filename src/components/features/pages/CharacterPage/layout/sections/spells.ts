import type {FieldNode} from '@type/FieldNode.ts'
import type {SheetFactory} from '@lib/fields/fieldNodes.ts'

// ---- INTERNAL CONSTANTS ----

const WEAPON_ROW_STEP = 27       // vertical gap between weapon rows
const CANTRIP_ROW_STEP = 23.33   // vertical gap between cantrip rows
const SPELL_SLOT_X_STEP = 24.93  // horizontal gap between spell-slot columns

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds the spellcasting fields: weapon rows, cantrip rows, spell-slot columns, and the save/attack/custom stats.
 */
export function buildSpells({inputNode, checkNode}: SheetFactory) {
    const weapons = [1, 2, 3, 4].map((row) => weaponRow(inputNode, row))
    const cantrips = [1, 2, 3, 4, 5, 6].map((row) => cantripRow(inputNode, checkNode, row))
    const spellSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((column) => spellSlotColumn(inputNode, column))

    const spellcasting = {
        spellSaveDC: inputNode({
            id: 'spellSaveDC',
            x: 296,
            y: 806,
            width: 52,
            height: 30,
            type: 'number',
            fontSize: 28
        }),
        spellAttackBonus: inputNode({
            id: 'spellAttackBonus',
            x: 352,
            y: 806,
            width: 52,
            height: 30,
            type: 'number',
            fontSize: 28
        }),

        customStatTitle: inputNode({
            id: 'customStatTitle',
            x: 439,
            y: 782.5,
            width: 52,
            height: 15,
            type: 'text',
            fontSize: 12,
            textAlign: 'center'
        }),
        customStat1: inputNode({
            id: 'customStat1',
            x: 411,
            y: 806,
            width: 52,
            height: 30,
            type: 'number',
            fontSize: 28
        }),
        customStat1Label: inputNode({
            id: 'customStat1Label',
            x: 417,
            y: 842,
            width: 40,
            height: 14,
            type: 'text',
            fontSize: 8,
            textAlign: 'center'
        }),
        customStat2: inputNode({
            id: 'customStat2',
            x: 469,
            y: 806,
            width: 52,
            height: 30,
            type: 'number',
            fontSize: 28
        }),
        customStat2Label: inputNode({
            id: 'customStat2Label',
            x: 475,
            y: 842,
            width: 40,
            height: 14,
            type: 'text',
            fontSize: 8,
            textAlign: 'center'
        }),
    }

    return {weapons, cantrips, spellSlots, spellcasting}
}

// ---- PRIVATE FUNCTIONS ----

/**
 * Fields for the weapon row at the given position (1-based).
 */
function weaponRow(inputNode: SheetFactory['inputNode'], row: number): FieldNode[] {
    const offsetY = (row - 1) * WEAPON_ROW_STEP
    return [
        inputNode({
            id: `weaponName${row}`,
            x: 301,
            y: 456 + offsetY,
            width: 99,
            height: 16,
            type: 'text',
            fontSize: 12
        }),
        inputNode({
            id: `weaponAttack${row}`,
            x: 406.2,
            y: 454.88 + offsetY,
            width: 24,
            height: 18,
            type: 'number',
            fontSize: 12
        }),
        inputNode({
            id: `weaponDamage${row}`,
            x: 435,
            y: 456 + offsetY,
            width: 73,
            height: 16,
            type: 'text',
            fontSize: 12
        }),
        inputNode({
            id: `weaponSlashing${row}`,
            x: 511.2,
            y: 455.73 + offsetY,
            width: 4.67,
            height: 4.67,
            type: 'check'
        }),
        inputNode({
            id: `weaponPiercing${row}`,
            x: 511.2,
            y: 461.73 + offsetY,
            width: 4.67,
            height: 4.67,
            type: 'check'
        }),
        inputNode({
            id: `weaponBludgeoning${row}`,
            x: 511.2,
            y: 467.6 + offsetY,
            width: 4.67,
            height: 4.67,
            type: 'check'
        }),
    ]
}

/**
 * Fields for the cantrip row at the given position (1-based).
 */
function cantripRow(inputNode: SheetFactory['inputNode'], checkNode: SheetFactory['checkNode'], row: number): FieldNode[] {
    const offsetY = (row - 1) * CANTRIP_ROW_STEP
    return [
        inputNode({
            id: `cantripPrepared${row}`,
            x: 290.4,
            y: 577.07 + offsetY,
            width: 4.67,
            height: 4.67,
            type: 'check'
        }),
        inputNode({
            id: `cantripName${row}`,
            x: 302,
            y: 569.07 + offsetY,
            width: 92,
            height: 16,
            type: 'text',
            fontSize: 12
        }),
        inputNode({
            id: `cantripEffect${row}`,
            x: 408,
            y: 569.07 + offsetY,
            width: 100,
            height: 16,
            type: 'text',
            fontSize: 12
        }),
        checkNode({
            id: `cantripSomatic${row}`,
            x: 510.3,
            y: 568.4 + offsetY,
            width: 4.67,
            height: 4.67,
            type: 'check',
            shape: 'diamond'
        }),
        checkNode({
            id: `cantripVerbal${row}`,
            x: 510.3,
            y: 574.3 + offsetY,
            width: 4.67,
            height: 4.67,
            type: 'check',
            shape: 'diamond'
        }),
        checkNode({
            id: `cantripMaterial${row}`,
            x: 510.3,
            y: 580.1 + offsetY,
            width: 4.67,
            height: 4.67,
            type: 'check',
            shape: 'diamond'
        }),
    ]
}

/**
 * Total/used fields for the slot column of the given spell level (1-based).
 */
function spellSlotColumn(inputNode: SheetFactory['inputNode'], column: number): FieldNode[] {
    const x = 302.7 + (column - 1) * SPELL_SLOT_X_STEP
    return [
        inputNode({id: `totalSpellSlots${column}`, x, y: 733, width: 12, height: 16, type: 'number', fontSize: 14}),
        inputNode({id: `usedSpellSlots${column}`, x, y: 757, width: 12, height: 18, type: 'number', fontSize: 14}),
    ]
}
