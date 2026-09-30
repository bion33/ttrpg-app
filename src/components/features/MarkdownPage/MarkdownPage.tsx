import {Suspense, lazy, useMemo} from 'react'
import {useAtom} from 'jotai'
import PaperPage from '@ui/PaperPage/PaperPage'
import {markdownAtom} from './markdownAtoms.ts'

// The Tiptap editor and its styles load as their own chunk rather than in the main bundle.
const MarkdownEditor = lazy(() => import('./MarkdownEditor.tsx'))

/**
 * Props for a notes page: the storage prefix its markdown persists under (one namespace per page).
 */
interface MarkdownPageProps {
    storagePrefix: string
}

/**
 * A general-purpose WYSIWYG markdown ("Notes") page: binds its markdown to the page's atom and lays it out on paper.
 */
function MarkdownPage({storagePrefix}: MarkdownPageProps) {
    const atom = useMemo(() => markdownAtom(storagePrefix), [storagePrefix])
    const [markdown, setMarkdown] = useAtom(atom)

    return (
        <PaperPage>
            <Suspense fallback={<p>Loading editor…</p>}>
                <MarkdownEditor markdown={markdown} onChange={setMarkdown}/>
            </Suspense>
        </PaperPage>
    )
}

export default MarkdownPage
