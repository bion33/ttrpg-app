import {NodeViewContent, NodeViewWrapper, type ReactNodeViewProps} from '@tiptap/react'
import ActionMenu from '@ui/ActionMenu/ActionMenu.tsx'
import {columnActions, rowActions} from './tableActions.ts'
import {cellInnerPosition, isLastCellInRow} from './tablePositions.ts'

/**
 * The node view for a table cell (header or data), rendering its editable content plus the Nextcloud-style "…" menus:
 * a per-column menu on every header cell, and an insert/delete-row menu on each data row's last cell. Header cells host
 * a <th>, data cells a <td>, so the table markup stays valid. (The whole-table delete menu lives on the table node view.)
 */
function TableCellNodeView({editor, node, getPos}: ReactNodeViewProps) {
    const position = getPos()
    const hasPosition = editor.isEditable && typeof position === 'number'
    const isHeader = node.type.name === 'tableHeader'
    // The caret target for this cell's row/column commands.
    const innerPosition = typeof position === 'number' ? cellInnerPosition(position) : 0
    const lastInRow = hasPosition && isLastCellInRow(editor.state.doc, position)
    return (
        <NodeViewWrapper as="div" className="tiptap-cell">
            <NodeViewContent className="tiptap-cell__content"/>
            {hasPosition && isHeader && (
                <span className="tiptap-cell__menu" contentEditable={false}>
                    <ActionMenu label="Column actions" actions={columnActions(editor, innerPosition)}/>
                </span>
            )}
            {lastInRow && !isHeader && (
                <span className="tiptap-cell__row-menu" contentEditable={false}>
                    <ActionMenu label="Row actions" actions={rowActions(editor, innerPosition)}/>
                </span>
            )}
        </NodeViewWrapper>
    )
}

export default TableCellNodeView
