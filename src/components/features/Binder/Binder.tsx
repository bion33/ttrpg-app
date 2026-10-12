import type {CSSProperties} from 'react'
import {useState} from 'react'
import {Navigate, useNavigate, useParams} from 'react-router'
import {useAtomValue} from 'jotai'
import {Library} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'
import './Binder.css'
import Tabs from './tabs/Tabs.tsx'
import AddTabModal from './tabs/modals/AddTabModal.tsx'
import TabControls from './tabs/TabControls.tsx'
import PageViewport from '@features/PageViewport/PageViewport.tsx'
import EditTabModal from './tabs/modals/EditTabModal.tsx'
import ConfirmModal from '@ui/ConfirmModal/ConfirmModal'
import {pagePrefix} from './binderAtoms.ts'
import {bindersAtom} from '@features/Library/libraryAtoms.ts'
import {PAGE_REGISTRY} from './pageRegistry.tsx'
import {useBinderPages} from './useBinderPages.ts'
import {tabBorderColor} from '@lib/colors/hueColors.ts'
import {binderPath, libraryPath} from '@lib/navigation/routePaths.ts'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import EmptyPage from '@pages/EmptyPage/EmptyPage'
import StorageControls from '@features/Storage/StorageControls.tsx'

/**
 * The whole page area of one binder, addressed by the URL's binder slug (and optional page slug): the active page
 * beside the binder-tab strip, with controls to add pages and return to the library. An unknown binder slug (e.g. a
 * stale URL after a storage load) redirects to the library.
 */
function Binder() {
    const {binderSlug = '', pageSlug} = useParams()
    const binders = useAtomValue(bindersAtom)
    const navigate = useNavigate()
    const {pages, active, visited, createPage, editPage, deletePage, reorderPages} = useBinderPages(binderSlug, pageSlug)
    const [adding, setAdding] = useState(false)
    // The last tab's element, watched so the back-to-top button appears once it scrolls out of view.
    const [lastTab, setLastTab] = useState<HTMLElement | null>(null)
    // Which edit dialogue is open for the active tab, if any.
    const [editing, setEditing] = useState<'edit' | 'delete' | null>(null)
    const naturalWidth = active ? PAGE_REGISTRY[active.type].naturalWidth : A4_WIDTH_PX

    if (!binders.some((binder) => binder.id === binderSlug)) return <Navigate to={libraryPath()} replace/>

    return (
        <div className="app-shell" style={{'--sheet-border-color': tabBorderColor(active?.hue ?? 0)} as CSSProperties}>
            <PageViewport naturalWidth={naturalWidth}>
                {/* Every visited page stays mounted; inactive ones are hidden (display:none), so switching tabs within the
                    binder is instant. Markdown pages draw their own per-sheet paper chrome, so the wrapper drops its
                    border/shadow for them. An empty binder (no active page) shows the untitled empty page. */}
                {active ? pages.filter((page) => visited.has(page.id)).map((page) => (
                    <main key={page.id} hidden={page.id !== active.id}
                          className={`page${page.type === 'markdown' ? ' page--bare' : ''}`}>
                        {PAGE_REGISTRY[page.type].render(
                            pagePrefix(binderSlug, page.storagePrefix), page.id === active.id, page.label,
                        )}
                    </main>
                )) : (
                    <main className="page"><EmptyPage/></main>
                )}
                <Tabs tabs={pages} activeId={active?.id ?? ''}
                      onSelect={(id) => navigate(binderPath(binderSlug, id))} onReorder={reorderPages}
                      onLastTabChange={setLastTab}/>
            </PageViewport>
            <TabControls onAdd={() => setAdding(true)} hasActive={!!active} onEdit={() => setEditing('edit')}
                         onDelete={(event) => (event.shiftKey ? deletePage() : setEditing('delete'))}
                         lastTab={lastTab}/>
            <StorageControls placement="binder" leading={
                <IconButton icon={<Library/>} label="Back to library" labelSide="right"
                            onClick={() => navigate(libraryPath())}/>
            }/>
            {adding && (
                <AddTabModal
                    onCreate={(name, type, markdownTemplateId) => {
                        createPage(name, type, markdownTemplateId)
                        setAdding(false)
                    }}
                    onCancel={() => setAdding(false)}
                />
            )}
            {active && editing === 'edit' && (
                <EditTabModal
                    initialLabel={active.label} initialHue={active.hue}
                    onSave={(label, hue) => {
                        editPage(label, hue)
                        setEditing(null)
                    }}
                    onCancel={() => setEditing(null)}
                />
            )}
            {active && editing === 'delete' && (
                <ConfirmModal
                    title="Delete tab"
                    message={`Delete “${active.label}”? This page and everything saved on it will be removed, which cannot be undone.`}
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={() => {
                        deletePage()
                        setEditing(null)
                    }}
                    onCancel={() => setEditing(null)}
                />
            )}
        </div>
    )
}

export default Binder
