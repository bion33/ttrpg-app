import type {CSSProperties} from 'react'
import {useEffect, useState} from 'react'
import {createPortal} from 'react-dom'
import {EditorContent, useEditor} from '@tiptap/react'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import StarterKit from '@tiptap/starter-kit'
import {Markdown} from '@tiptap/markdown'
import {TaskList} from '@tiptap/extension-task-list'
import {TaskItem} from '@tiptap/extension-task-item'
import {Image} from '@tiptap/extension-image'
import './MarkdownPage.css'
import {Callout} from './extensions/callout.ts'
import {PageBreak} from './extensions/pageBreak.ts'
import {Pagination} from './extensions/pagination/pagination.ts'
import {tableExtensions} from './extensions/table/tableExtensions.ts'
import MarkdownToolbar from './MarkdownToolbar.tsx'
import BlockHandle from './BlockHandle.tsx'

/**
 * Props for the markdown editor: the markdown to show (read on mount, and re-applied if it changes externally, e.g. a
 * storage load), a change handler for each edit, and whether this editor is the binder's active page (editors for the
 * binder's other, inactive pages stay mounted but hidden, so they suppress their body-portalled toolbar and handle).
 */
interface MarkdownEditorProps {
    markdown: string
    onChange: (markdown: string) => void
    active: boolean
}

/**
 * The lazily-loaded Tiptap editor: a WYSIWYG markdown editor with core formatting plus tables, images, task lists, and
 * callouts, a formatting toolbar, and a per-block drag/insert handle, its content round-tripping as a markdown string.
 */
function MarkdownEditor({markdown, onChange, active}: MarkdownEditorProps) {
    // The number of A4 sheets the content spans, reported by the pagination extension; drives the backdrop sheets.
    const [pageCount, setPageCount] = useState(1)
    const editor = useEditor({
        extensions: [
            StarterKit.configure({link: false, codeBlock: false}),
            Markdown,
            TaskList,
            TaskItem.configure({nested: true}),
            ...tableExtensions,
            Image,
            Callout,
            PageBreak,
            Pagination.configure({onPageCountChange: setPageCount}),
        ],
        content: markdown,
        contentType: 'markdown',
        onUpdate: ({editor}) => onChange(editor.getMarkdown()),
    })

    // Re-apply markdown that changed outside the editor (e.g. a storage load swaps the atom's value); the equality
    // guard skips the editor's own edits, which already match, so this never fights the user's typing. The isDestroyed
    // guard skips a stale editor surfaced during React 19's StrictMode double-mount (its command manager is torn down).
    useEffect(() => {
        if (!editor || editor.isDestroyed || editor.getMarkdown() === markdown) return
        editor.commands.setContent(markdown, {contentType: 'markdown', emitUpdate: false})
    }, [editor, markdown])

    if (!editor) return null

    return (
        <div className="markdown-page__editor" style={{'--md-sheet-width': `${A4_WIDTH_PX}px`} as CSSProperties}>
            {/* The toolbar (portalled out of the zoomed .binder-view to the viewport bottom, see MarkdownPage.css) and the
                block handle render only for the active page: an inactive page is hidden via display:none, but the portal
                escapes that, so its toolbar would otherwise linger over the active page. */}
            {active && createPortal(<MarkdownToolbar editor={editor}/>, document.body)}
            {active && <BlockHandle editor={editor}/>}
            <div className="md-sheets">
                {/* One A4 sheet per page behind the flow; the first fuses with the active tab, the rest stack below. */}
                <div className="md-sheet-backdrop" aria-hidden="true">
                    {Array.from({length: pageCount}, (_, index) => (
                        <div key={index} className={`md-sheet${index === 0 ? ' md-sheet--first' : ''}`}/>
                    ))}
                </div>
                <EditorContent editor={editor} className="markdown-page__content"/>
            </div>
        </div>
    )
}

export default MarkdownEditor
