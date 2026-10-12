import type {CSSProperties} from 'react'
import {Navigate, useNavigate, useParams} from 'react-router'
import {useAtomValue} from 'jotai'
import {Library} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'
import PageViewport from '@features/PageViewport/PageViewport.tsx'
import MarkdownPage from '@pages/MarkdownPage/MarkdownPage'
import StorageControls from '@features/Storage/StorageControls.tsx'
import {libraryPath} from '@lib/navigation/routePaths.ts'
import {tabBorderColor} from '@lib/colors/hueColors.ts'
import {markdownTemplatesAtom, templateContentPrefix} from './templateAtoms.ts'

/**
 * The full-editor surface for authoring a markdown template, addressed by the URL's template slug: the markdown page
 * under the shared zoom scaffold, with storage controls and a back-to-library button, but without the binder's tab
 * strip or tab controls. An unknown template slug (e.g. a stale URL after a storage load) redirects to the library.
 */
function TemplateEditor() {
    const {templateSlug = ''} = useParams()
    const templates = useAtomValue(markdownTemplatesAtom)
    const navigate = useNavigate()

    if (!templates.some((template) => template.id === templateSlug)) return <Navigate to={libraryPath()} replace/>

    return (
        <div className="app-shell" style={{'--sheet-border-color': tabBorderColor(0)} as CSSProperties}>
            <PageViewport naturalWidth={MarkdownPage.naturalWidth}>
                <main className="page page--bare">
                    <MarkdownPage storagePrefix={templateContentPrefix(templateSlug)} active/>
                </main>
            </PageViewport>
            <StorageControls placement="binder" leading={
                <IconButton icon={<Library/>} label="Back to library" labelSide="right"
                            onClick={() => navigate(libraryPath())}/>
            }/>
        </div>
    )
}

export default TemplateEditor
