import {describe, expect, it} from 'vitest'
import {getSchema} from '@tiptap/core'
import {Table, TableCell, TableHeader, TableRow} from '@tiptap/extension-table'
import {Document} from '@tiptap/extension-document'
import {Paragraph} from '@tiptap/extension-paragraph'
import {Text} from '@tiptap/extension-text'
import type {Node as ProseMirrorNode} from '@tiptap/pm/model'
import {
    firstCellInnerPosition, isLastCellInRow, lastColumnCellPosition, lastRowCellPosition,
} from './tablePositions.ts'

const schema = getSchema([Document, Paragraph, Text, Table, TableRow, TableHeader, TableCell])

// Builds a cell holding a one-word paragraph, so cell content occupies a known, non-empty span.
function cell(type: 'tableHeader' | 'tableCell', word: string): ProseMirrorNode {
    return schema.nodes[type].create(null, schema.nodes.paragraph.create(null, schema.text(word)))
}

// Builds a doc holding one table: a header row then `dataRows` data rows, each `columns` wide.
function tableDoc(columns: number, dataRows: number): ProseMirrorNode {
    const header = schema.nodes.tableRow.create(null,
        Array.from({length: columns}, (_unused, column) => cell('tableHeader', `h${column}`)))
    const rows = Array.from({length: dataRows}, (_unused, row) =>
        schema.nodes.tableRow.create(null,
            Array.from({length: columns}, (_unused, column) => cell('tableCell', `r${row}c${column}`))))
    return schema.nodes.doc.create(null, schema.nodes.table.create(null, [header, ...rows]))
}

describe('cell positions', () => {
    it('firstCellInnerPosition lands inside the first cell of the row', () => {
        const doc = tableDoc(2, 1)
        // The table starts at 0; its first row (header) starts at position 1.
        const resolved = doc.resolve(firstCellInnerPosition(1))
        expect(resolved.parent.type.name).toBe('paragraph')
        expect(resolved.node(-1).type.name).toBe('tableHeader')
    })

    it('lastRowCellPosition lands inside the first cell of the last row', () => {
        const doc = tableDoc(3, 2)
        const table = doc.firstChild!
        const position = lastRowCellPosition(table, 0)
        const resolved = doc.resolve(position)
        expect(resolved.node(-1).type.name).toBe('tableCell')
        expect(resolved.parent.textContent).toBe('r1c0')
    })

    it('lastColumnCellPosition lands inside the last cell of the first row', () => {
        const doc = tableDoc(3, 2)
        const table = doc.firstChild!
        const position = lastColumnCellPosition(table, 0)
        const resolved = doc.resolve(position)
        expect(resolved.node(-1).type.name).toBe('tableHeader')
        expect(resolved.parent.textContent).toBe('h2')
    })

    it('isLastCellInRow is true only for the final cell of a row', () => {
        const doc = tableDoc(3, 1)
        const headerRow = doc.firstChild!.child(0)
        // Collect each header cell's start position (the position just before the cell).
        const cellStarts: number[] = []
        let offset = 2 // header row starts at 1; +1 enters it, before its first cell
        headerRow.forEach((headerCell) => {
            cellStarts.push(offset)
            offset += headerCell.nodeSize
        })
        expect(isLastCellInRow(doc, cellStarts[0])).toBe(false)
        expect(isLastCellInRow(doc, cellStarts[2])).toBe(true)
    })
})
