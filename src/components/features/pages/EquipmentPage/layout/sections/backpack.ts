import type {FieldNode} from '@type/FieldNode.ts'
import type {EquipmentSheetFactory} from '@pages/EquipmentPage/layout/nodes.ts'

// ---- INTERNAL CONSTANTS ----

const ROW_COUNT = 28         // one row below each of the 28 grey dividers under BACKPACK
const FIRST_ROW_Y = 184      // y of the first (topmost) divider, in viewBox units
const ROW_STEP = 15.19       // vertical gap between dividers ((593.4 - 183.4) / 27)
const ROW_HEIGHT = 14.5      // field height within a row

const ITEM_X = 584           // left edge of the wide item field
const ITEM_WIDTH = 166       // runs up to the grey WT column
const WEIGHT_X = 749.7       // left edge of the grey WT column
const WEIGHT_WIDTH = 14      // matches the grey WT column width

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds the backpack item rows: one row below each grey divider, each a wide item field and a thin weight field.
 *
 * All coordinates are in the artwork's viewBox units (see FieldDefinition).
 */
export function buildBackpack({inputNode}: EquipmentSheetFactory) {
    const rows = Array.from({length: ROW_COUNT}, (_unused, index) => backpackRow(inputNode, index + 1))
    return {rows}
}

// ---- PRIVATE FUNCTIONS ----

/**
 * Fields for the backpack row at the given position (1-based): the wide item name and the thin weight.
 */
function backpackRow(inputNode: EquipmentSheetFactory['inputNode'], row: number): FieldNode[] {
    const y = FIRST_ROW_Y + (row - 1) * ROW_STEP
    return [
        inputNode({
            id: `backpackItem${row}`,
            x: ITEM_X,
            y,
            width: ITEM_WIDTH,
            height: ROW_HEIGHT,
            type: 'text',
            fontSize: 10,
        }),
        inputNode({
            id: `backpackWeight${row}`,
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
