import {NodeViewContent, NodeViewWrapper, type ReactNodeViewProps} from '@tiptap/react'
import {Plus} from 'lucide-react'
import ActionMenu from '@ui/ActionMenu/ActionMenu.tsx'
import {deleteTableActions} from './tableActions.ts'
import {lastColumnCellPosition, lastRowCellPosition} from './tablePositions.ts'

/**
 * The node view for a table: wraps the table in a positioned container holding the editable grid, a bottom-edge button
 * that appends a row, a right-edge button that appends a column, and the table "…" menu in the bottom-right corner
 * square those two edge strips leave open.
 */
function TableNodeView({editor, node, getPos}: ReactNodeViewProps) {
    const position = getPos()
    const showControls = editor.isEditable && typeof position === 'number'

    // Appends a column by selecting the last cell of the first row, then adding a column after it.
    function addColumn() {
        if (typeof position !== 'number') return
        editor.chain().focus().setTextSelection(lastColumnCellPosition(node, position)).addColumnAfter().run()
    }

    // Appends a row by selecting the first cell of the last row, then adding a row after it.
    function addRow() {
        if (typeof position !== 'number') return
        editor.chain().focus().setTextSelection(lastRowCellPosition(node, position)).addRowAfter().run()
    }

    return (
        <NodeViewWrapper as="div" className="tiptap-table-wrapper">
            {/* The <table> is the node's content host; ProseMirror appends its <tbody> (see contentDOMElementTag in
                tableExtensions) here, so rows nest as <table><tbody><tr> and the table markup stays valid. */}
            <NodeViewContent<'table'> as="table" className="tiptap-table"/>
            {showControls && (
                <>
                    <div className="tiptap-table-controls" contentEditable={false}>
                        <button type="button" className="tiptap-table-add tiptap-table-add--column" title="Add column"
                                aria-label="Add column" onMouseDown={(event) => event.preventDefault()}
                                onClick={addColumn}><Plus size={16}/>
                        </button>
                    </div>
                    <button type="button" className="tiptap-table-add tiptap-table-add--row" title="Add row"
                            aria-label="Add row" contentEditable={false}
                            onMouseDown={(event) => event.preventDefault()} onClick={addRow}><Plus size={16}/>
                    </button>
                    <div className="tiptap-table-menu" contentEditable={false}>
                        <ActionMenu label="Table actions"
                                    actions={deleteTableActions(editor, lastColumnCellPosition(node, position))}/>
                    </div>
                </>
            )}
        </NodeViewWrapper>
    )
}

export default TableNodeView
