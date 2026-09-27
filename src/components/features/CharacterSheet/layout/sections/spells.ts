import type {FieldNode} from '../../../../../types/FieldNode.ts'
import type {SheetFactory} from '../nodes.ts'
import type {CheckFieldDefinition} from "../../../../../types/CheckFieldDefinition.ts";

// ---- INTERNAL CONSTANTS ----

const WEAPON_ROW_STEP = 27       // vertical gap between weapon rows
const CANTRIP_ROW_STEP = 23.33   // vertical gap between cantrip rows
const SPELL_SLOT_X_STEP = 24.93  // horizontal gap between spell-slot columns

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds the spellcasting fields: weapon rows, cantrip rows, spell-slot columns, and the save/attack/custom stats.
 */
export function buildSpells({inputNode}: SheetFactory) {
    const weapons = [1, 2, 3, 4].map((n) => weaponRow(inputNode, n))
    const cantrips = [1, 2, 3, 4, 5, 6].map((n) => cantripRow(inputNode, n))
    const spellSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => spellSlotColumn(inputNode, n))

    const spellcasting = {
        spellSaveDC: inputNode({id: 'spellSaveDC', x: 296, y: 806, width: 52, height: 30, type: 'number', fontSize: 28}),
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
        customStat1: inputNode({id: 'customStat1', x: 411, y: 806, width: 52, height: 30, type: 'number', fontSize: 28}),
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
        customStat2: inputNode({id: 'customStat2', x: 469, y: 806, width: 52, height: 30, type: 'number', fontSize: 28}),
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
 * Fields for the n-th weapon row.
 */
function weaponRow(inputNode: SheetFactory['inputNode'], n: number): FieldNode[] {
    const dy = (n - 1) * WEAPON_ROW_STEP
    return [
        inputNode({id: `weaponName${n}`, x: 301, y: 456 + dy, width: 99, height: 16, type: 'text', fontSize: 12}),
        inputNode({
            id: `weaponAttack${n}`,
            x: 406.2,
            y: 454.88 + dy,
            width: 24,
            height: 18,
            type: 'number',
            fontSize: 12
        }),
        inputNode({id: `weaponDamage${n}`, x: 435, y: 456 + dy, width: 73, height: 16, type: 'text', fontSize: 12}),
        inputNode({id: `weaponSlashing${n}`, x: 511.2, y: 455.73 + dy, width: 4.67, height: 4.67, type: 'check'}),
        inputNode({id: `weaponPiercing${n}`, x: 511.2, y: 461.73 + dy, width: 4.67, height: 4.67, type: 'check'}),
        inputNode({id: `weaponBludgeoning${n}`, x: 511.2, y: 467.6 + dy, width: 4.67, height: 4.67, type: 'check'}),
    ]
}

/**
 * Fields for the n-th cantrip row.
 */
function cantripRow(inputNode: SheetFactory['inputNode'], n: number): FieldNode[] {
    const dy = (n - 1) * CANTRIP_ROW_STEP
    return [
        inputNode({id: `cantripPrepared${n}`, x: 290.4, y: 577.07 + dy, width: 4.67, height: 4.67, type: 'check'}),
        inputNode({id: `cantripName${n}`, x: 302, y: 569.07 + dy, width: 92, height: 16, type: 'text', fontSize: 12}),
        inputNode({
            id: `cantripEffect${n}`,
            x: 408,
            y: 569.07 + dy,
            width: 100,
            height: 16,
            type: 'text',
            fontSize: 12
        } as CheckFieldDefinition),
        inputNode({
            id: `cantripSomatic${n}`,
            x: 510.3,
            y: 568.4 + dy,
            width: 4.67,
            height: 4.67,
            type: 'check',
            shape: 'diamond'
        } as CheckFieldDefinition),
        inputNode({
            id: `cantripVerbal${n}`,
            x: 510.3,
            y: 574.3 + dy,
            width: 4.67,
            height: 4.67,
            type: 'check',
            shape: 'diamond'
        } as CheckFieldDefinition),
        inputNode({
            id: `cantripMaterial${n}`,
            x: 510.3,
            y: 580.1 + dy,
            width: 4.67,
            height: 4.67,
            type: 'check',
            shape: 'diamond'
        } as CheckFieldDefinition),
    ]
}

/**
 * Total/used fields for the n-th spell level's slot column.
 */
function spellSlotColumn(inputNode: SheetFactory['inputNode'], n: number): FieldNode[] {
    const x = 302.7 + (n - 1) * SPELL_SLOT_X_STEP
    return [
        inputNode({id: `totalSpellSlots${n}`, x, y: 733, width: 12, height: 16, type: 'number', fontSize: 14}),
        inputNode({id: `usedSpellSlots${n}`, x, y: 757, width: 12, height: 18, type: 'number', fontSize: 14}),
    ]
}
