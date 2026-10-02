import {collectNodes} from '@lib/fields/fieldNodes.ts'
import type {FieldNode} from '@type/FieldNode.ts'
import {createEquipmentSheetFactory} from './nodes.ts'
import {buildEquipment} from './sections/equipment.ts'

/**
 * One assembled equipment sheet: the flat render list of its field nodes.
 */
export interface EquipmentSheet {
    fields: FieldNode[]
}

/**
 * Builds one equipment sheet's fields under the given storage-key prefix.
 *
 * All coordinates are in the artwork's viewBox units (see FieldDefinition). Every field is created exactly once (in its
 * section builder) and gathered into a structured tree, which `collectNodes` flattens into the flat `fields` render
 * list. Call once per sheet instance (memoized per prefix in the component).
 */
export function buildEquipmentSheet(storagePrefix: string): EquipmentSheet {
    const factory = createEquipmentSheetFactory(storagePrefix)
    const equipment = buildEquipment(factory)

    const tree = {
        equipment,
    }

    return {fields: collectNodes(tree)}
}
