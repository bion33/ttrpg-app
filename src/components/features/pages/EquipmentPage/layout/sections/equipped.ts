import type {SheetFactory} from '@lib/fields/fieldNodes.ts'
import {buildItemRows} from '@pages/EquipmentPage/layout/generators.ts'

// Rows whose artwork is a fixed prefilled header, so they get no inputs.
const PREFILLED_HEADER_ROWS = new Set([3, 5, 8, 11, 14, 17, 23, 26])

/**
 * Builds the equipped item rows: one `{item, weight}` row below each grey divider under EQUIPPED, skipping the rows whose
 * artwork is a fixed prefilled header.
 */
export function buildEquipped({inputNode}: SheetFactory) {
    return buildItemRows(inputNode, {idPrefix: 'equipped', itemX: 380, weightX: 545.7, skipRows: PREFILLED_HEADER_ROWS})
}
