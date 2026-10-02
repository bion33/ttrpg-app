import type {Editor} from '@tiptap/core'
import {ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, type LucideIcon, Trash2} from 'lucide-react'

/**
 * One command in a table "…" menu: its menu label and icon, whether it removes structure (styled as destructive), and
 * a handler that applies it.
 */
export interface TableAction {
    id: string
    label: string
    icon: LucideIcon
    destructive: boolean
    run: () => void
}

// Builds a chain that places the caret inside `cellPosition` first, so the command targets that cell's row/column.
function focusCell(editor: Editor, cellPosition: number) {
    return () => editor.chain().focus().setTextSelection(cellPosition)
}

/**
 * The column "…" menu actions for a header cell at `cellPosition`: insert a column before/after it, or delete it.
 */
export function columnActions(editor: Editor, cellPosition: number): TableAction[] {
    const focus = focusCell(editor, cellPosition)
    return [
        {id: 'addColumnBefore', label: 'Insert column before', icon: ArrowLeftToLine, destructive: false,
            run: () => focus().addColumnBefore().run()},
        {id: 'addColumnAfter', label: 'Insert column after', icon: ArrowRightToLine, destructive: false,
            run: () => focus().addColumnAfter().run()},
        {id: 'deleteColumn', label: 'Delete column', icon: Trash2, destructive: true,
            run: () => focus().deleteColumn().run()},
    ]
}

/**
 * The row "…" menu actions for a data row whose caret target is `cellPosition`: insert a row before/after, or delete it.
 */
export function rowActions(editor: Editor, cellPosition: number): TableAction[] {
    const focus = focusCell(editor, cellPosition)
    return [
        {id: 'addRowBefore', label: 'Insert row before', icon: ArrowUpToLine, destructive: false,
            run: () => focus().addRowBefore().run()},
        {id: 'addRowAfter', label: 'Insert row after', icon: ArrowDownToLine, destructive: false,
            run: () => focus().addRowAfter().run()},
        {id: 'deleteRow', label: 'Delete row', icon: Trash2, destructive: true,
            run: () => focus().deleteRow().run()},
    ]
}

/**
 * The header-row "…" menu action whose caret target is `cellPosition`: delete the whole table.
 */
export function deleteTableActions(editor: Editor, cellPosition: number): TableAction[] {
    const focus = focusCell(editor, cellPosition)
    return [
        {id: 'deleteTable', label: 'Delete table', icon: Trash2, destructive: true,
            run: () => focus().deleteTable().run()},
    ]
}
