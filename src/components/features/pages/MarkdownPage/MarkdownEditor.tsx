import type {CSSProperties} from 'react'
import {useEffect, useState} from 'react'
import {createPortal} from 'react-dom'
import {useLocation, useNavigate} from 'react-router'
import {EditorContent, useEditor} from '@tiptap/react'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import StarterKit from '@tiptap/starter-kit'
import {Markdown} from '@tiptap/markdown'
import {TaskList} from '@tiptap/extension-task-list'
import {TaskItem} from '@tiptap/extension-task-item'
import '@ui/ActionMenu/ActionMenu.css'
import './MarkdownPage.css'
import {Callout} from './extensions/callout.ts'
import {Link} from './extensions/link.ts'
import {HeadingAnchors} from './extensions/headingAnchors.ts'
import {Image} from './extensions/image/image.ts'
import {PageBreak} from './extensions/pageBreak.ts'
import {Pagination} from './extensions/pagination/pagination.ts'
import {tableExtensions} from './extensions/table/tableExtensions.ts'
import MarkdownToolbar from './toolbar/MarkdownToolbar.tsx'
import BlockHandle from './blocks/BlockHandle.tsx'
import ImageSourceModal from '@ui/ImageSourceModal/ImageSourceModal.tsx'
import LinkModal from './link/LinkModal.tsx'
import {applyLink, type LinkSelection, readLinkSelection, removeLink} from './link/linkCommands.ts'
import {handleLinkClick} from './link/linkClick.ts'
import {findHeading} from './link/headingScroll.ts'

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
    // Whether the insert-image dialog is open; on confirm it inserts at the editor's current selection.
    const [imageDialogOpen, setImageDialogOpen] = useState(false)
    // The href and label the link dialog opens with (from the selection or the link under the caret), or null when closed.
    const [linkDialog, setLinkDialog] = useState<LinkSelection | null>(null)
    const navigate = useNavigate()
    // The browser location, watched so navigating to a `#heading` anchor scrolls that heading into view.
    const routerLocation = useLocation()
    const editor = useEditor({
        extensions: [
            StarterKit.configure({link: false, codeBlock: false}),
            Markdown,
            TaskList,
            TaskItem.configure({nested: true}),
            Link.configure({openOnClick: false, HTMLAttributes: {target: '_blank', rel: 'noopener noreferrer'}}),
            HeadingAnchors,
            ...tableExtensions,
            Image,
            Callout,
            PageBreak,
            Pagination.configure({onPageCountChange: setPageCount}),
        ],
        content: markdown,
        contentType: 'markdown',
        editorProps: {handleDOMEvents: {click: (_view, event) => handleLinkClick(event, navigate)}},
        onUpdate: ({editor}) => onChange(editor.getMarkdown()),
    })

    // Re-apply markdown that changed outside the editor (e.g. a storage load swaps the atom's value); the equality
    // guard skips the editor's own edits, which already match, so this never fights the user's typing. The isDestroyed
    // guard skips a stale editor surfaced during React 19's StrictMode double-mount (its command manager is torn down).
    useEffect(() => {
        if (!editor || editor.isDestroyed || editor.getMarkdown() === markdown) return
        editor.commands.setContent(markdown, {contentType: 'markdown', emitUpdate: false})
    }, [editor, markdown])

    // When the URL names a heading (`#slug`) on this active page, smooth-scroll it to the top of the view. Waits for the
    // layout above the heading to settle before scrolling, rather than scrolling as soon as the anchor exists: the
    // anchor is rendered before pagination inserts its spacer gaps and late images load, and that expansion would
    // otherwise push the heading down the view mid-animation. Each frame it measures the heading's offset within the
    // editor (scroll-independent, so a shift above it shows up) and fires the single smooth scroll once that offset
    // holds steady, or the budget runs out. Scoped to this editor's DOM (several may share ids).
    useEffect(() => {
        if (!active || !editor) return
        const slug = routerLocation.hash.replace(/^#/, '')
        if (!slug) return
        const root = editor.view.dom
        let frame = 0
        let attempts = 0
        let settledFrames = 0
        let lastOffset = Number.NaN
        const align = () => {
            if (editor.isDestroyed) return
            const giveUp = attempts++ > 60
            const target = findHeading(root, slug)
            if (target) {
                const offset = Math.round(target.getBoundingClientRect().top - root.getBoundingClientRect().top)
                settledFrames = offset === lastOffset ? settledFrames + 1 : 0
                lastOffset = offset
                if (settledFrames >= 2 || giveUp) {
                    target.scrollIntoView({behavior: 'smooth', block: 'start'})
                    return
                }
            } else if (giveUp) return
            frame = requestAnimationFrame(align)
        }
        frame = requestAnimationFrame(align)
        return () => cancelAnimationFrame(frame)
    }, [active, editor, routerLocation.hash])

    if (!editor) return null

    return (
        <div className="markdown-page__editor" style={{'--md-sheet-width': `${A4_WIDTH_PX}px`} as CSSProperties}>
            {/* The toolbar (portalled out of the zoomed .binder-view to the viewport bottom, see MarkdownPage.css) and the
                block handle render only for the active page: an inactive page is hidden via display:none, but the portal
                escapes that, so its toolbar would otherwise linger over the active page. */}
            {active && createPortal(
                <MarkdownToolbar editor={editor} onRequestImage={() => setImageDialogOpen(true)}
                                 onRequestLink={() => setLinkDialog(readLinkSelection(editor))}/>,
                document.body)}
            {active && <BlockHandle editor={editor} onRequestImage={() => setImageDialogOpen(true)}/>}
            {/* Portalled to the body like the toolbar: rendered in place it would sit inside the zoomed, page-tall
                `.binder-view` transform, which confines its fixed backdrop to the editor and scales it. */}
            {imageDialogOpen && createPortal(
                <ImageSourceModal
                    onInsert={(value) => {
                        editor.chain().focus().setImage({src: value}).run()
                        setImageDialogOpen(false)
                    }}
                    onCancel={() => setImageDialogOpen(false)}
                />, document.body)}
            {linkDialog && createPortal(
                <LinkModal
                    initialUrl={linkDialog.url}
                    initialLabel={linkDialog.label}
                    onSubmit={(link) => {
                        applyLink(editor, link)
                        setLinkDialog(null)
                    }}
                    onRemove={() => {
                        removeLink(editor)
                        setLinkDialog(null)
                    }}
                    onCancel={() => setLinkDialog(null)}
                />, document.body)}
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
