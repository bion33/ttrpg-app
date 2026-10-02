import type {EquipmentSheetFactory} from '@pages/EquipmentPage/layout/nodes.ts'
import {buildItemRows} from '@pages/EquipmentPage/layout/generators.ts'

/**
 * Builds the backpack item rows: one `{item, weight}` row below each grey divider under BACKPACK.
 */
export function buildBackpack({inputNode}: EquipmentSheetFactory) {
    return buildItemRows(inputNode, {idPrefix: 'backpack', itemX: 584, weightX: 749.7})
}
