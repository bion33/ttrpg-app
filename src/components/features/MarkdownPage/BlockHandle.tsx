import {useCallback, useRef, useState} from 'react'
import type {Editor} from '@tiptap/core'
import DragHandle from '@tiptap/extension-drag-handle-react'
import {useDismissOnOutside} from '@hooks/useDismissOnOutside.ts'
import {BLOCK_ACTIONS, type BlockAction} from './blocks/insertBlocks.ts'

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
    const closeMenu = useCallback(() => setMenuOpen(false), [])
    useDismissOnOutside(containerReference, menuOpen, closeMenu)

    // Moves the cursor into the hovered block, then applies the action there.
    function runAction(action: BlockAction) {
        if (hoveredPosition.current !== null) {
            editor.chain().focus().setTextSelection(hoveredPosition.current + 1).run()
        }
        action.run(editor)
        setMenuOpen(false)
    }

    return (
        <DragHandle
            editor={editor}
            className="block-handle no-print"
            // placement 'left' centres the handle on the block; 'fixed' anchors it to the zoomed `.binder-view`
            // (its containing block), the case floating-ui compensates scale for — 'absolute' drifts under page zoom.
            computePositionConfig={{placement: 'left', strategy: 'fixed'}}
            onNodeChange={({pos}) => {
                hoveredPosition.current = pos
                setMenuOpen(false)
            }}
        >
            <div className="block-handle__cluster" ref={containerReference}>
                <button
                    type="button"
                    className="block-handle__btn"
                    title="Insert block"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => setMenuOpen((open) => !open)}
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
