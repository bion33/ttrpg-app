import type {Node as ProseMirrorNode} from '@tiptap/pm/model'

/**
 * The caret position just inside a cell that starts at `cellPosition` — the target for a cell-scoped table command.
 */
export function cellInnerPosition(cellPosition: number): number {
    // cellPosition is before the cell; +1 enters the cell, +1 its first paragraph.
    return cellPosition + 2
}

/**
 * The caret position just inside the first cell of a row at `rowPosition`, used to target a row-level table command.
 */
export function firstCellInnerPosition(rowPosition: number): number {
    // rowPosition is before the row; +1 enters the row, reaching the first cell's start.
    return cellInnerPosition(rowPosition + 1)
}

/**
 * Whether the cell starting at `cellPosition` is the last cell of its row — the cell that carries the row's "…" menu.
 */
export function isLastCellInRow(doc: ProseMirrorNode, cellPosition: number): boolean {
    const resolved = doc.resolve(cellPosition)
    return resolved.index() === resolved.parent.childCount - 1
}

// The rows of a table paired with the document position each one starts at.
function rowEntries(table: ProseMirrorNode, tablePosition: number): {node: ProseMirrorNode; position: number}[] {
    const rows: {node: ProseMirrorNode; position: number}[] = []
    let offset = tablePosition + 1
    table.forEach((row) => {
        rows.push({node: row, position: offset})
        offset += row.nodeSize
    })
    return rows
}

// The caret position inside the first paragraph of a row's last cell.
function lastCellInnerPosition(row: ProseMirrorNode, rowPosition: number): number {
    let offset = rowPosition + 1
    let lastCellStart = offset
    row.forEach((cell) => {
        lastCellStart = offset
        offset += cell.nodeSize
    })
    return cellInnerPosition(lastCellStart)
}

/**
 * The caret position inside the first cell of the table's last row — where an "add row at the end" command should act.
 */
export function lastRowCellPosition(table: ProseMirrorNode, tablePosition: number): number {
    const rows = rowEntries(table, tablePosition)
    return firstCellInnerPosition(rows[rows.length - 1].position)
}

/**
 * The caret position inside the last cell of the table's first row — where an "add column at the end" command acts.
 */
export function lastColumnCellPosition(table: ProseMirrorNode, tablePosition: number): number {
    const firstRow = rowEntries(table, tablePosition)[0]
    return lastCellInnerPosition(firstRow.node, firstRow.position)
}
