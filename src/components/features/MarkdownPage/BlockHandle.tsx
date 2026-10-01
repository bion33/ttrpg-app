import {useCallback, useRef, useState} from 'react'
import type {Editor} from '@tiptap/core'
import DragHandle from '@tiptap/extension-drag-handle-react'
import {useDismissOnOutside} from '@hooks/useDismissOnOutside.ts'
import {BLOCK_ACTIONS, type BlockAction} from './blocks/insertBlocks.ts'

// Stable identity so the React DragHandle's effect does not tear down and re-register the plugin on every render
// (which resets the handle's position and drops its lock). placement 'left' centres the handle on the block;
// 'fixed' anchors it to the zoomed `.binder-view` (its containing block), the case floating-ui compensates scale
// for — 'absolute' drifts under page zoom.
const COMPUTE_POSITION_CONFIG = {placement: 'left', strategy: 'fixed'} as const

/**
 * Props for the block handle: the editor whose blocks it acts on.
 */
interface BlockHandleProps {
    editor: Editor
}

/**
 * The per-block hover affordance shown beside the current line: a drag grip to reorder blocks and a "+" button that
 * opens a menu inserting any block type (the Nextcloud-style block handle).
 */
function BlockHandle({editor}: BlockHandleProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    // The document position of the block currently under the handle, used to target the "+" menu's insert.
    const hoveredPosition = useRef<number | null>(null)
    const containerReference = useRef<HTMLDivElement>(null)

    // Pins the handle in place and visible while the menu is open, so the extension's hover tracking cannot
    // reposition or hide it (and close the menu) as the pointer moves toward the menu. The drag-handle plugin
    // reads this `lockDragHandle` transaction meta; the React component registers only the plugin, so the
    // extension's lock commands are unavailable and the meta is dispatched directly.
    const setMenu = useCallback((open: boolean) => {
        editor.view.dispatch(editor.state.tr.setMeta('lockDragHandle', open))
        setMenuOpen(open)
    }, [editor])
    const closeMenu = useCallback(() => setMenu(false), [setMenu])
    useDismissOnOutside(containerReference, menuOpen, closeMenu)

    // Moves the cursor into the hovered block, then applies the action there.
    function runAction(action: BlockAction) {
        if (hoveredPosition.current !== null) {
            editor.chain().focus().setTextSelection(hoveredPosition.current + 1).run()
        }
        action.run(editor)
        closeMenu()
    }

    return (
        <DragHandle
            editor={editor}
            className="block-handle no-print"
            computePositionConfig={COMPUTE_POSITION_CONFIG}
            onNodeChange={({pos}) => {
                hoveredPosition.current = pos
                // A locked handle suppresses hover changes, so this only reaches an open menu defensively.
                if (menuOpen) closeMenu()
            }}
        >
            <div className="block-handle__cluster" ref={containerReference}>
                <button
                    type="button"
                    className="block-handle__btn"
                    title="Insert block"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => setMenu(!menuOpen)}
                >+
                </button>
                <span className="block-handle__grip" title="Drag to move">⠿</span>
                {menuOpen && (
                    <ul className="block-handle__menu">
                        {BLOCK_ACTIONS.map((action) => (
                            <li key={action.id}>
                                <button type="button" onMouseDown={(event) => event.stopPropagation()}
                                        onClick={() => runAction(action)}>{action.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </DragHandle>
    )
}

export default BlockHandle
