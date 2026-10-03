import type {SheetFactory} from '@lib/fields/fieldNodes.ts'

// ---- INTERNAL CONSTANTS ----
// Shared row geometry for the EQUIPPED and BACKPACK item lists (identical grids in different columns).

const ROW_COUNT = 28         // one row below each of the 28 grey dividers
const FIRST_ROW_Y = 184      // y of the first (topmost) divider, in viewBox units
const ROW_STEP = 15.19       // vertical gap between dividers ((593.4 - 183.4) / 27)
const ROW_HEIGHT = 14.5      // field height within a row
const ITEM_WIDTH = 166       // width of the wide item field, up to the grey WT column
const WEIGHT_WIDTH = 14      // matches the grey WT column width

// ---- EXPORTED TYPES ----

/**
 * The placement distinguishing one item-and-weight list from another: its field-id prefix and the two columns' left
 * edges. `skipRows` are the 1-based rows whose artwork is a fixed prefilled header, so they get no inputs.
 */
export interface ItemListConfig {
    idPrefix: string
    itemX: number
    weightX: number
    skipRows?: ReadonlySet<number>
}

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds one item-and-weight list: one `{item, weight}` row below each grey divider (a wide item name and a thin
 * weight), skipping any prefilled-header rows. All coordinates are in the artwork's viewBox units (see FieldDefinition).
 */
export function buildItemRows(inputNode: SheetFactory['inputNode'], config: ItemListConfig) {
    const rows = Array.from({length: ROW_COUNT}, (_unused, index) => index + 1)
        .filter((row) => !config.skipRows?.has(row))
        .map((row) => itemRow(inputNode, config, row))
    return {rows}
}

// ---- PRIVATE FUNCTIONS ----

/**
 * Fields for one item-and-weight row at the given position (1-based): the wide item name and the thin weight.
 */
function itemRow(inputNode: SheetFactory['inputNode'], config: ItemListConfig, row: number) {
    const y = FIRST_ROW_Y + (row - 1) * ROW_STEP
    return {
        item: inputNode({
            id: `${config.idPrefix}Item${row}`,
            x: config.itemX,
            y,
            width: ITEM_WIDTH,
            height: ROW_HEIGHT,
            type: 'text',
            fontSize: 10,
        }),
        weight: inputNode({
            id: `${config.idPrefix}Weight${row}`,
            x: config.weightX,
            y,
            width: WEIGHT_WIDTH,
            height: ROW_HEIGHT,
            type: 'number',
            fontSize: 10,
            textAlign: 'center',
        }),
    }
}
