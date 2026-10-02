import type {CSSProperties} from 'react'
import {Library} from 'lucide-react'
import './TemplateEditor.css'
import IconButton from '@ui/IconButton/IconButton'
import PageViewport from '@features/PageViewport/PageViewport.tsx'
import MarkdownPage from '@features/MarkdownPage/MarkdownPage'
import StorageControls from '@features/Storage/StorageControls.tsx'
import {useLocation, useNavigate} from '@hooks/useNavigation.ts'
import {libraryLocation} from '@lib/navigation/navigation.ts'
import {tabBorderColor} from '@lib/colors/hueColors.ts'
import {templateContentPrefix} from './templateAtoms.ts'

/**
 * The full-editor surface for authoring a markdown template: the markdown page under the shared zoom scaffold, with
 * storage controls and a back-to-library button, but without the binder's tab strip or tab controls.
 */
function TemplateEditor() {
    const location = useLocation()
    const navigate = useNavigate()
    const templateId = location.markdownTemplateId ?? ''

    return (
        <div className="app-shell" style={{'--sheet-border-color': tabBorderColor(0)} as CSSProperties}>
            <PageViewport naturalWidth={MarkdownPage.naturalWidth}>
                <main className="page page--bare">
                    <MarkdownPage storagePrefix={templateContentPrefix(templateId)} active/>
                </main>
            </PageViewport>
            <div className="template-editor__library corner-cluster no-print">
                <IconButton icon={<Library/>} label="Back to library" labelSide="right"
                            onClick={() => navigate(libraryLocation())}/>
            </div>
            <StorageControls placement="binder"/>
        </div>
    )
}

export default TemplateEditor
