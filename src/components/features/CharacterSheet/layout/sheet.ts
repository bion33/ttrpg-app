import {collectNodes} from '../../../../lib/fieldNodes.ts'
import type {FieldNode} from '../../../../types/FieldNode.ts'
import {header} from './sections/header.ts'
import {abilities, abilityMeta} from './sections/abilities.ts'
import {combat, deathSaves, hitDice} from './sections/combat.ts'
import {cantrips, spellcasting, spellSlots, weapons} from './sections/spells.ts'
import {damage, notes, proficiencies} from './sections/traits.ts'

/**
 * All coordinates are in the artwork's viewBox units (see FieldDefinition).
 *
 * The single source of truth for the sheet's fields. Every field is created
 * exactly once (in its section module); both structured access (for logic) and
 * the flat render list below derive from this one tree. Logic reads a field by
 * reference (e.g. `sheet.abilities.strength.score.atom`); the flat `Fields`
 * list is just this tree walked once by `collectNodes`.
 */
export const sheet = {
    header,
    abilityMeta,
    abilities,
    combat,
    weapons,
    cantrips,
    spellSlots,
    spellcasting,
    notes,
    hitDice,
    deathSaves,
    damage,
    proficiencies,
}

/**
 * Flat list for rendering: the tree above, walked once. No field is named twice.
 */
export const Fields: FieldNode[] = collectNodes(sheet)
