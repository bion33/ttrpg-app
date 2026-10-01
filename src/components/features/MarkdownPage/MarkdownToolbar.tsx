import type {ReactNode} from 'react'
import type {Editor} from '@tiptap/core'
import {useEditorState} from '@tiptap/react'
import {Bold, Italic, Strikethrough, Underline} from 'lucide-react'
import {BLOCK_ACTIONS, BLOCK_GROUPS, INSERT_ACTIONS} from './blocks/insertBlocks.ts'
import ToolbarDropdown from './ToolbarDropdown.tsx'

/**
 * Props for the toolbar: the editor it drives.
 */
interface MarkdownToolbarProps {
    editor: Editor
}

// The inline marks, kept here (not in insertBlocks) since the block-insert menu does not apply marks.
const MARKS: {id: string; icon: ReactNode; name: string; run: (editor: Editor) => void}[] = [
    {id: 'bold', icon: <Bold size={16} strokeWidth={2.75}/>, name: 'Bold',
        run: (editor) => editor.chain().focus().toggleBold().run()},
    {id: 'italic', icon: <Italic size={16}/>, name: 'Italic',
        run: (editor) => editor.chain().focus().toggleItalic().run()},
    {id: 'underline', icon: <Underline size={16}/>, name: 'Underlined',
        run: (editor) => editor.chain().focus().toggleUnderline().run()},
    {id: 'strike', icon: <Strikethrough size={16}/>, name: 'Strikethrough',
        run: (editor) => editor.chain().focus().toggleStrike().run()},
]

// The Headings dropdown sits before the marks; the rest (Blocks, Lists) follow them.
const HEADING_GROUP = BLOCK_GROUPS.filter((group) => group.id === 'heading')
const OTHER_GROUPS = BLOCK_GROUPS.filter((group) => group.id !== 'heading')

/**
 * The formatting toolbar: undo/redo, the headings dropdown, inline marks, the block dropdowns, and the insert
 * buttons, driving the editor's commands.
 */
function MarkdownToolbar({editor}: MarkdownToolbarProps) {
    const state = useEditorState({
        editor,
        selector: ({editor}) => ({
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
            marks: MARKS.map((mark) => editor.isActive(mark.id)),
            blocks: Object.fromEntries(BLOCK_ACTIONS.map((action) => [action.id, action.isActive(editor)])),
        }),
    })

    // Renders a group's dropdown, feeding it the live active flag of each of its actions.
    function renderGroup(group: (typeof BLOCK_GROUPS)[number]) {
        return (
            <ToolbarDropdown key={group.id} editor={editor} label={group.label} icon={group.icon} actions={group.actions}
                             activeStates={group.actions.map((action) => state.blocks[action.id])}/>
        )
    }

    return (
        <div className="markdown-toolbar no-print">
            <button type="button" aria-label="Undo" data-tooltip="Undo"
                    className="markdown-toolbar__btn markdown-toolbar__btn--history has-tooltip has-tooltip--top"
                    disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>↶
            </button>
            <button type="button" aria-label="Redo" data-tooltip="Redo"
                    className="markdown-toolbar__btn markdown-toolbar__btn--history has-tooltip has-tooltip--top"
                    disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>↷
            </button>
            <span className="markdown-toolbar__sep"/>

            {HEADING_GROUP.map(renderGroup)}
            <span className="markdown-toolbar__sep"/>

            {MARKS.map((mark, index) => (
                <button key={mark.id} type="button" aria-label={mark.name} data-tooltip={mark.name}
                        className={'markdown-toolbar__btn markdown-toolbar__btn--icon has-tooltip has-tooltip--top' +
                            (state.marks[index] ? ' is-active' : '')}
                        onClick={() => mark.run(editor)}>{mark.icon}
                </button>
            ))}
            <span className="markdown-toolbar__sep"/>

            {OTHER_GROUPS.map(renderGroup)}
            <span className="markdown-toolbar__sep"/>

            {INSERT_ACTIONS.map((action) => {
                const ActionIcon = action.icon
                return (
                    <button key={action.id} type="button" aria-label={action.label} data-tooltip={action.label}
                            className={'markdown-toolbar__btn markdown-toolbar__btn--icon has-tooltip has-tooltip--top' +
                                (state.blocks[action.id] ? ' is-active' : '')}
                            onClick={() => action.run(editor)}><ActionIcon size={16}/>
                    </button>
                )
            })}
        </div>
    )
}

export default MarkdownToolbar
