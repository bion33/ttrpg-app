import {collectNodes} from '../../../../lib/fieldNodes.ts'
import type {FieldNode} from '../../../../types/FieldNode.ts'
import {createSheetFactory} from './nodes.ts'
import {buildHeader} from './sections/header.ts'
import {buildAbilities} from './sections/abilities.ts'
import {buildCombat} from './sections/combat.ts'
import {buildSpells} from './sections/spells.ts'
import {buildTraits} from './sections/traits.ts'

/**
 * One assembled character sheet: the structured field tree (for logic, read by reference) and the flat render list.
 */
export interface Sheet {
    tree: object
    fields: FieldNode[]
}

/**
 * Builds one character sheet's fields under the given storage-key prefix.
 *
 * All coordinates are in the artwork's viewBox units (see FieldDefinition). Every field is created exactly once (in
 * its section builder); both structured access (e.g. `tree.abilities.strength.score.atom`) and the flat `fields`
 * render list derive from the single tree. Call once per sheet instance (memoized per prefix in the component).
 */
export function buildSheet(storagePrefix: string): Sheet {
    const factory = createSheetFactory(storagePrefix)
    const header = buildHeader(factory)
    const {abilityMeta, abilities} = buildAbilities(factory)
    const {combat, hitDice, deathSaves} = buildCombat(factory)
    const {weapons, cantrips, spellSlots, spellcasting} = buildSpells(factory)
    const {notes, damage, proficiencies} = buildTraits(factory)

    const tree = {
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

    return {tree, fields: collectNodes(tree)}
}
