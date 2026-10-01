import {Suspense, lazy, useEffect, useMemo, useState} from 'react'
import {useAtom} from 'jotai'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import {markdownAtom} from './markdownAtoms.ts'
import PaperPage from "@ui/PaperPage/PaperPage.tsx";
import LoadingSpinner from '@ui/LoadingSpinner/LoadingSpinner.tsx'

// The Tiptap editor and its styles load as their own chunk rather than in the main bundle.
const MarkdownEditor = lazy(() => import('./MarkdownEditor.tsx'))

// The notes page's natural (unscaled) on-screen width: a physical A4 sheet, the footprint the binder's zoom scales.
const naturalWidth = A4_WIDTH_PX

/**
 * Props for a notes page: the storage prefix its markdown persists under (one namespace per page), and whether it is the
 * binder's active page (an inactive page stays mounted but hidden, so its editor suppresses its floating toolbar/handle).
 */
interface MarkdownPageProps {
    storagePrefix: string
    active: boolean
}

/**
 * A general-purpose WYSIWYG markdown ("Notes") page: binds its markdown to the page's atom; the editor lays the content
 * out across stacked A4 sheets (see the pagination extension), so this page owns no paper chrome of its own.
 */
function MarkdownPage({storagePrefix, active}: MarkdownPageProps) {
    const atom = useMemo(() => markdownAtom(storagePrefix), [storagePrefix])
    const [markdown, setMarkdown] = useAtom(atom)
    // Defer mounting the heavy editor by one frame so the tab switch and loading text paint first — otherwise the
    // synchronous Tiptap build (and, on a cache miss, the lazy chunk) blocks the main thread before anything appears.
    const [mountEditor, setMountEditor] = useState(false)

    useEffect(() => {
        const frame = requestAnimationFrame(() => setMountEditor(true))
        return () => cancelAnimationFrame(frame)
    }, [])

    const loading = (
        <PaperPage width={naturalWidth} className="markdown-page__loading-sheet">
            <LoadingSpinner/>
        </PaperPage>
    )
    if (!mountEditor) return loading

    return (
        <Suspense fallback={loading}>
            <MarkdownEditor markdown={markdown} onChange={setMarkdown} active={active}/>
        </Suspense>
    )
}

// Exposed so the binder's zoom can scale the sheet to a fraction of the viewport, like the character sheet.
MarkdownPage.naturalWidth = naturalWidth

export default MarkdownPage
