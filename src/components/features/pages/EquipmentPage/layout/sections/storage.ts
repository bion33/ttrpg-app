import type {SheetFactory} from '@lib/fields/fieldNodes.ts'

// ---- INTERNAL CONSTANTS ----

const ROW_COUNT = 15             // 14 grey horizontal dividers bound 15 writing rows per group
const FIRST_DIVIDER_Y = 728      // y of the first (topmost) horizontal divider
const DIVIDER_STEP = 20.8        // vertical gap between horizontal dividers, and every row's height
const ROW_INSET = 1              // vertical padding kept clear of each row's top divider
const COLUMN_GAP = 2             // horizontal padding kept clear of each side of a vertical divider

// Column x-edges per group: itemX/weightX are the two grey vertical dividers' centerlines (their
// ~0.23-unit stroke is negligible); countX/rightEdge are the box's own left/right edges.
const LEFT_GROUP = {countX: 48.67, itemX: 73.73, weightX: 372.27, rightEdge: 395.47}
const RIGHT_GROUP = {countX: 413.2, itemX: 434.73, weightX: 736.6, rightEdge: 760.13}

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds the storage item rows: 15 rows in each of the two side-by-side groups, each row a thin
 * count field, a wide item field, and a thin weight field matching the group's grey dividers.
 *
 * All coordinates are in the artwork's viewBox units (see FieldDefinition).
 */
export function buildStorage({inputNode}: SheetFactory) {
    const bands = Array.from({length: ROW_COUNT}, (_unused, index) => rowBand(index))
    const leftRows = bands.map((band, index) => storageRow(inputNode, LEFT_GROUP, band, index + 1))
    const rightRows = bands.map((band, index) => storageRow(inputNode, RIGHT_GROUP, band, ROW_COUNT + index + 1))
    return {leftRows, rightRows}
}

// ---- PRIVATE FUNCTIONS ----

type StorageGroup = typeof LEFT_GROUP
type RowBand = { y: number; height: number }

/**
 * The vertical extent of the writing row at the given position (0-based): a uniform row height whose
 * bottom sits on the row's divider, so the first row grows up past the box top and the last grows down.
 */
function rowBand(index: number): RowBand {
    const top = FIRST_DIVIDER_Y + (index - 1) * DIVIDER_STEP
    return {y: top + ROW_INSET, height: DIVIDER_STEP - ROW_INSET}
}

/**
 * Fields for one storage row (globally numbered): the thin count, the wide item name, and the thin weight.
 */
function storageRow(
    inputNode: SheetFactory['inputNode'],
    group: StorageGroup,
    band: RowBand,
    number: number,
) {
    return {
        count: inputNode({
            id: `storageCount${number}`,
            x: group.countX,
            y: band.y,
            width: group.itemX - group.countX - COLUMN_GAP,
            height: band.height,
            type: 'number',
            fontSize: 10,
            textAlign: 'center',
        }),
        item: inputNode({
            id: `storageItem${number}`,
            x: group.itemX + COLUMN_GAP,
            y: band.y,
            width: group.weightX - group.itemX - COLUMN_GAP * 2,
            height: band.height,
            type: 'text',
            fontSize: 10,
        }),
        weight: inputNode({
            id: `storageWeight${number}`,
            x: group.weightX + COLUMN_GAP,
            y: band.y,
            width: group.rightEdge - group.weightX - COLUMN_GAP,
            height: band.height,
            type: 'number',
            fontSize: 10,
            textAlign: 'center',
        }),
    }
}
