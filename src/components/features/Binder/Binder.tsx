import type {CSSProperties} from 'react'
import {useState} from 'react'
import './Binder.css'
import Tabs from './tabs/Tabs.tsx'
import AddTabModal from './tabs/modals/AddTabModal.tsx'
import TabControls from './tabs/TabControls.tsx'
import PageViewport from '@features/PageViewport/PageViewport.tsx'
import EditTabModal from './tabs/modals/EditTabModal.tsx'
import ConfirmModal from '@ui/ConfirmModal/ConfirmModal'
import {pagePrefix} from './binderAtoms.ts'
import {PAGE_REGISTRY} from './pageRegistry.tsx'
import {useBinderPages} from './useBinderPages.ts'
import {tabBorderColor} from '@lib/colors/hueColors.ts'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import EmptyPage from '@pages/EmptyPage/EmptyPage'
import {useNavigate} from '@hooks/useNavigation.ts'
import StorageControls from '@features/Storage/StorageControls.tsx'

/**
 * Props for a binder: the storage prefix (its library id) all its pages persist under, and the callback that returns
 * to the library shelf.
 */
interface BinderProps {
    storagePrefix: string
    onExit: () => void
}

/**
 * The whole page area of one binder: the active page beside the binder-tab strip, with controls to add pages and
 * return to the library.
 */
function Binder({storagePrefix, onExit}: BinderProps) {
    const navigate = useNavigate()
    const {pages, active, visited, createPage, editPage, deletePage, reorderPages} = useBinderPages(storagePrefix)
    const [adding, setAdding] = useState(false)
    // The last tab's element, watched so the back-to-top button appears once it scrolls out of view.
    const [lastTab, setLastTab] = useState<HTMLElement | null>(null)
    // Which edit dialogue is open for the active tab, if any.
    const [editing, setEditing] = useState<'edit' | 'delete' | null>(null)
    const naturalWidth = active ? PAGE_REGISTRY[active.type].naturalWidth : A4_WIDTH_PX

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
                            pagePrefix(storagePrefix, page.storagePrefix), page.id === active.id, page.label,
                        )}
                    </main>
                )) : (
                    <main className="page"><EmptyPage/></main>
                )}
                <Tabs tabs={pages} activeId={active?.id ?? ''}
                      onSelect={(id) => navigate({binderId: storagePrefix, pageId: id})} onReorder={reorderPages}
                      onLastTabChange={setLastTab}/>
            </PageViewport>
            <TabControls onAdd={() => setAdding(true)} hasActive={!!active} onEdit={() => setEditing('edit')}
                         onDelete={(event) => (event.shiftKey ? deletePage() : setEditing('delete'))} onExit={onExit}
                         lastTab={lastTab}/>
            <StorageControls placement="binder"/>
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
