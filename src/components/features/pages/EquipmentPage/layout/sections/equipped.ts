import type {FieldNode} from '@type/FieldNode.ts'
import type {EquipmentSheetFactory} from '@pages/EquipmentPage/layout/nodes.ts'

// ---- INTERNAL CONSTANTS ----

const ROW_COUNT = 28         // one row below each of the 28 grey dividers under EQUIPPED
const FIRST_ROW_Y = 184      // y of the first (topmost) divider, in viewBox units
const ROW_STEP = 15.19       // vertical gap between dividers ((593.4 - 183.4) / 27)
const ROW_HEIGHT = 14.5      // field height within a row

const ITEM_X = 380           // left edge of the wide item field
const ITEM_WIDTH = 166       // runs up to the grey WT column
const WEIGHT_X = 545.7       // left edge of the grey WT column
const WEIGHT_WIDTH = 14      // matches the grey WT column width

// Rows whose artwork is a fixed prefilled header, so they get no inputs.
const PREFILLED_HEADER_ROWS = new Set([3, 5, 8, 11, 14, 17, 23, 26])

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds the equipped item rows: one row below each grey divider, each a wide item field and a thin weight field,
 * skipping the rows whose artwork is a fixed prefilled header.
 *
 * All coordinates are in the artwork's viewBox units (see FieldDefinition).
 */
export function buildEquipped({inputNode}: EquipmentSheetFactory) {
    const rows = Array.from({length: ROW_COUNT}, (_unused, index) => index + 1)
        .filter((row) => !PREFILLED_HEADER_ROWS.has(row))
        .map((row) => equippedRow(inputNode, row))
    return {rows}
}

// ---- PRIVATE FUNCTIONS ----

/**
 * Fields for the equipped row at the given position (1-based): the wide item name and the thin weight.
 */
function equippedRow(inputNode: EquipmentSheetFactory['inputNode'], row: number): FieldNode[] {
    const y = FIRST_ROW_Y + (row - 1) * ROW_STEP
    return [
        inputNode({
            id: `equippedItem${row}`,
            x: ITEM_X,
            y,
            width: ITEM_WIDTH,
            height: ROW_HEIGHT,
            type: 'text',
            fontSize: 10,
        }),
        inputNode({
            id: `equippedWeight${row}`,
            x: WEIGHT_X,
            y,
            width: WEIGHT_WIDTH,
            height: ROW_HEIGHT,
            type: 'number',
            fontSize: 10,
            textAlign: 'center',
        }),
    ]
}
