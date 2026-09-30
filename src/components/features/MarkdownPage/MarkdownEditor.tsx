import {createPortal} from 'react-dom'
import {EditorContent, useEditor} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {Markdown} from '@tiptap/markdown'
import {TaskList} from '@tiptap/extension-task-list'
import {TaskItem} from '@tiptap/extension-task-item'
import {Image} from '@tiptap/extension-image'
import './MarkdownPage.css'
import {Callout} from './extensions/callout.ts'
import {tableExtensions} from './extensions/table/tableExtensions.ts'
import MarkdownToolbar from './MarkdownToolbar.tsx'
import BlockHandle from './BlockHandle.tsx'

/**
 * Props for the markdown editor: its initial markdown (read on mount only) and a change handler for each edit.
 */
interface MarkdownEditorProps {
    markdown: string
    onChange: (markdown: string) => void
}

/**
 * The lazily-loaded Tiptap editor: a WYSIWYG markdown editor with core formatting plus tables, images, task lists, and
 * callouts, a formatting toolbar, and a per-block drag/insert handle, its content round-tripping as a markdown string.
 */
function MarkdownEditor({markdown, onChange}: MarkdownEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({link: false, codeBlock: false}),
            Markdown,
            TaskList,
            TaskItem.configure({nested: true}),
            ...tableExtensions,
            Image,
            Callout,
        ],
        content: markdown,
        contentType: 'markdown',
        onUpdate: ({editor}) => onChange(editor.getMarkdown()),
    })

    if (!editor) return null

    return (
        <div className="markdown-page__editor">
            {/* Portalled out of the zoomed .binder-view so it floats at the viewport bottom (see MarkdownPage.css). */}
            {createPortal(<MarkdownToolbar editor={editor}/>, document.body)}
            <BlockHandle editor={editor}/>
            <EditorContent editor={editor} className="markdown-page__content"/>
        </div>
    )
}

export default MarkdownEditor
