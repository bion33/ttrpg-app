import {useCallback, useRef, useState} from 'react'
import type {Editor} from '@tiptap/core'
import DragHandle from '@tiptap/extension-drag-handle-react'
import {GripVertical, Plus} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'
import {BLOCK_ACTIONS, type BlockAction, runBlockAction} from './blocks/insertBlocks.ts'
import BlockActionsMenu from './BlockActionsMenu.tsx'

// Stable identity so the React DragHandle's effect does not tear down and re-register the plugin on every render
// (which resets the handle's position and drops its lock). placement 'left' centres the handle on the block;
// 'fixed' anchors it to the zoomed `.binder-view` (its containing block), the case floating-ui compensates scale
// for — 'absolute' drifts under page zoom.
const COMPUTE_POSITION_CONFIG = {placement: 'left', strategy: 'fixed'} as const

/**
 * Props for the block handle: the editor whose blocks it acts on and the callback opening the insert-image dialog.
 */
interface BlockHandleProps {
    editor: Editor
    onRequestImage: () => void
}

/**
 * The per-block hover affordance shown beside the current line: a drag grip to reorder blocks and a "+" button that
 * opens the searchable block menu inserting any block type (the Nextcloud-style block handle).
 */
function BlockHandle({editor, onRequestImage}: BlockHandleProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    // The document position of the block currently under the handle, used to target the "+" menu's insert.
    const hoveredPosition = useRef<number | null>(null)

    // Pins the handle in place and visible while the menu is open, so the extension's hover tracking cannot
    // reposition or hide it as the pointer moves toward the menu. The drag-handle plugin reads this `lockDragHandle`
    // transaction meta; the React component registers only the plugin, so the extension's lock commands are
    // unavailable and the meta is dispatched directly.
    const setMenu = useCallback((open: boolean) => {
        editor.view.dispatch(editor.state.tr.setMeta('lockDragHandle', open))
        setMenuOpen(open)
    }, [editor])

    // Moves the cursor into the hovered block, then applies the action there.
    function runAction(action: BlockAction) {
        if (hoveredPosition.current !== null) {
            editor.chain().focus().setTextSelection(hoveredPosition.current + 1).run()
        }
        runBlockAction(action, editor, {onRequestImage})
    }

    return (
        <DragHandle
            editor={editor}
            className="block-handle no-print"
            computePositionConfig={COMPUTE_POSITION_CONFIG}
            onNodeChange={({pos}) => {
                hoveredPosition.current = pos
                // A locked handle suppresses hover changes, so this only reaches an open menu defensively.
                if (menuOpen) setMenu(false)
            }}
        >
            <div className="block-handle__cluster">
                <BlockActionsMenu editor={editor} actions={BLOCK_ACTIONS} open={menuOpen} onOpenChange={setMenu}
                                  onRunAction={runAction} markActive={false}
                                  trigger={
                                      <IconButton icon={<Plus/>} label="Insert block" size="small" appearance="flat"
                                                  className="block-handle__btn"
                                                  onMouseDown={(event) => event.stopPropagation()}/>
                                  }/>
                <IconButton icon={<GripVertical/>} label="Drag to move" size="small" appearance="flat"
                            className="block-handle__grip"/>
            </div>
        </DragHandle>
    )
}

export default BlockHandle
