import type {SheetFactory} from '@lib/fields/fieldNodes.ts'
import {buildItemRows} from '@pages/EquipmentPage/layout/generators.ts'

/**
 * Builds the backpack item rows: one `{item, weight}` row below each grey divider under BACKPACK.
 */
export function buildBackpack({inputNode}: SheetFactory) {
    return buildItemRows(inputNode, {idPrefix: 'backpack', itemX: 584, weightX: 749.7})
}
