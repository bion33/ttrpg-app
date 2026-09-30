import {NodeViewContent, NodeViewWrapper, type ReactNodeViewProps} from '@tiptap/react'
import TableActionMenu from './TableActionMenu.tsx'
import {columnActions, rowActions} from './tableActions.ts'
import {isLastCellInRow} from './tablePositions.ts'

/**
 * The node view for a table cell (header or data), rendering its editable content plus the Nextcloud-style "…" menus:
 * a per-column menu on every header cell, and an insert/delete-row menu on each data row's last cell. Header cells host
 * a <th>, data cells a <td>, so the table markup stays valid. (The whole-table delete menu lives on the table node view.)
 */
function TableCellNodeView({editor, node, getPos}: ReactNodeViewProps) {
    const position = getPos()
    const hasPosition = editor.isEditable && typeof position === 'number'
    const isHeader = node.type.name === 'tableHeader'
    // position is before the cell; +1 enters the cell, +1 its first paragraph — the caret target for cell-scoped commands.
    const cellInnerPosition = typeof position === 'number' ? position + 2 : 0
    const lastInRow = hasPosition && isLastCellInRow(editor.state.doc, position)
    return (
        <NodeViewWrapper as="div" className="tiptap-cell">
            <NodeViewContent className="tiptap-cell__content"/>
            {hasPosition && isHeader && (
                <span className="tiptap-cell__menu" contentEditable={false}>
                    <TableActionMenu label="Column actions" actions={columnActions(editor, cellInnerPosition)}/>
                </span>
            )}
            {lastInRow && !isHeader && (
                <span className="tiptap-cell__row-menu" contentEditable={false}>
                    <TableActionMenu label="Row actions" actions={rowActions(editor, cellInnerPosition)}/>
                </span>
            )}
        </NodeViewWrapper>
    )
}

export default TableCellNodeView
