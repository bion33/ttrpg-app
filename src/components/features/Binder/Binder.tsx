import type {CSSProperties, ReactNode} from 'react'
import {useEffect, useState} from 'react'
import {useAtom, useSetAtom, useStore} from 'jotai'
import './Binder.css'
import {useLocation, useNavigate} from '@hooks/useNavigation.ts'
import Tabs from './tabs/Tabs.tsx'
import AddTabModal from './tabs/modals/AddTabModal.tsx'
import TabControls from './tabs/TabControls.tsx'
import PageViewport from '@features/PageViewport/PageViewport.tsx'
import EditTabModal from './tabs/modals/EditTabModal.tsx'
import ConfirmModal from '@ui/ConfirmModal/ConfirmModal'
import type {PageType} from './pageTypes.ts'
import type {Page} from './binderAtoms.ts'
import {activePageAtom, pagePrefix, pagesAtom} from './binderAtoms.ts'
import {newId} from '@lib/ids/newId.ts'
import {tabHue} from '@lib/colors/tabHue.ts'
import {tabBorderColor} from '@lib/colors/hueColors.ts'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import CharacterPage from '@pages/CharacterPage/CharacterPage'
import CharacterInfoPage from '@pages/CharacterInfoPage/CharacterInfoPage'
import EquipmentPage from '@pages/EquipmentPage/EquipmentPage'
import MarkdownPage from '@pages/MarkdownPage/MarkdownPage'
import EmptyPage from '@pages/EmptyPage/EmptyPage'
import StorageControls from '@features/Storage/StorageControls.tsx'
import {seedMarkdownContent} from '@features/Templates/templateAtoms.ts'

/**
 * Props for a binder: the storage prefix (its library id) all its pages persist under, and the callback that returns
 * to the library shelf.
 */
interface BinderProps {
    storagePrefix: string
    onExit: () => void
}

/**
 * Resolves a page descriptor to its element, each bound to its binder-prefixed storage prefix: a character sheet, a
 * markdown notes page, or the labelled empty page. `active` tells a notes page whether it is the shown page (every
 * visited page stays mounted; the inactive ones are hidden), so its editor can suppress its floating toolbar/handle.
 */
function renderPage(page: Page, storagePrefix: string, active: boolean): ReactNode {
    const prefix = pagePrefix(storagePrefix, page.storagePrefix)
    if (page.type === 'characterSheet') {
        return <CharacterPage storagePrefix={prefix}/>
    }
    if (page.type === 'characterInfo') {
        return <CharacterInfoPage storagePrefix={prefix}/>
    }
    if (page.type === 'equipment') {
        return <EquipmentPage storagePrefix={prefix}/>
    }
    if (page.type === 'markdown') {
        return <MarkdownPage storagePrefix={prefix} active={active}/>
    }
    return <EmptyPage title={page.label}/>
}

/**
 * The natural (unscaled) on-screen width of a page of the given type, each page component the source of its own width,
 * so the zoom scales every page to the same fraction of the viewport (and a future differently-sized page just works).
 */
function pageNaturalWidth(type: PageType | undefined): number {
    if (type === 'characterSheet') return CharacterPage.naturalWidth
    if (type === 'characterInfo') return CharacterInfoPage.naturalWidth
    if (type === 'equipment') return EquipmentPage.naturalWidth
    if (type === 'markdown') return MarkdownPage.naturalWidth
    // The empty stand-in uses PaperPage, itself a physical A4 sheet.
    return A4_WIDTH_PX
}

/**
 * The whole page area of one binder: the active page beside the binder-tab strip, with controls to add pages and
 * return to the library.
 */
function Binder({storagePrefix, onExit}: BinderProps) {
    const [pages, setPages] = useAtom(pagesAtom(storagePrefix))
    const store = useStore()
    const location = useLocation()
    const navigate = useNavigate()
    const rememberActivePage = useSetAtom(activePageAtom(storagePrefix))
    const activeId = location.pageId
    const [adding, setAdding] = useState(false)
    // The last tab's element, watched so the back-to-top button appears once it scrolls out of view.
    const [lastTab, setLastTab] = useState<HTMLElement | null>(null)
    // Which edit dialogue is open for the active tab, if any.
    const [editing, setEditing] = useState<'edit' | 'delete' | null>(null)
    const activeIndex = Math.max(0, pages.findIndex((page) => page.id === activeId))
    const active = pages.length ? pages[activeIndex] : undefined
    // The ids of pages visited since this binder opened: each stays mounted (hidden when not active) so switching back
    // to a tab is instant rather than rebuilding its editor. It is grown during render (the endorsed "adjust state
    // while rendering" pattern) as each shown page resolves, and lives only for the binder's mount, so leaving the
    // binder (which remounts it) clears the set.
    const [visited, setVisited] = useState<Set<string>>(() => new Set())
    if (active && !visited.has(active.id)) {
        setVisited(new Set(visited).add(active.id))
    }

    // Persists the shown page as this binder's remembered active page, so reopening it returns here.
    useEffect(() => rememberActivePage(activeId), [activeId, rememberActivePage])

    // Appends a new page of the chosen type; its GUID id doubles as the page's storage prefix. A markdown page created
    // from a template seeds its content from that template's live body.
    function createPage(name: string, type: PageType, markdownTemplateId?: string) {
        const id = newId()
        setPages([...pages, {id, label: name, type, storagePrefix: id, hue: tabHue(pages.length)}])
        if (type === 'markdown' && markdownTemplateId) {
            seedMarkdownContent(store, pagePrefix(storagePrefix, id), markdownTemplateId)
        }
        navigate({binderId: storagePrefix, pageId: id})
        setAdding(false)
    }

    // Edits the active tab's label and hue (its id and stored fields are unchanged).
    function editPage(label: string, hue: number) {
        setPages((previous) => previous.map((page) => (page.id === activeId ? {...page, label, hue} : page)))
        setEditing(null)
    }

    // Removes the active page, then activates its neighbour so a page stays selected when one remains.
    function deletePage() {
        const index = pages.findIndex((page) => page.id === activeId)
        const next = pages.filter((page) => page.id !== activeId)
        setPages(next)
        navigate({binderId: storagePrefix, pageId: next.length ? next[Math.min(index, next.length - 1)].id : ''})
        setEditing(null)
    }

    // Moves the page at index `from` to index `to`, persisting the new tab order.
    function reorderPages(from: number, to: number) {
        setPages((previous) => {
            const next = previous.slice()
            const [moved] = next.splice(from, 1)
            next.splice(to, 0, moved)
            return next
        })
    }

    return (
        <div className="app-shell" style={{'--sheet-border-color': tabBorderColor(active?.hue ?? 0)} as CSSProperties}>
            <PageViewport naturalWidth={pageNaturalWidth(active?.type)}>
                {/* Every visited page stays mounted; inactive ones are hidden (display:none), so switching tabs within the
                    binder is instant. Markdown pages draw their own per-sheet paper chrome, so the wrapper drops its
                    border/shadow for them. An empty binder (no active page) shows the untitled empty page. */}
                {active ? pages.filter((page) => visited.has(page.id)).map((page) => (
                    <main key={page.id} hidden={page.id !== active.id}
                          className={`page${page.type === 'markdown' ? ' page--bare' : ''}`}>
                        {renderPage(page, storagePrefix, page.id === active.id)}
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
            {adding && <AddTabModal onCreate={createPage} onCancel={() => setAdding(false)}/>}
            {active && editing === 'edit' && (
                <EditTabModal initialLabel={active.label} initialHue={active.hue} onSave={editPage}
                              onCancel={() => setEditing(null)}/>
            )}
            {active && editing === 'delete' && (
                <ConfirmModal
                    title="Delete tab"
                    message={`Delete “${active.label}”? This page and everything saved on it will be removed, which cannot be undone.`}
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={deletePage}
                    onCancel={() => setEditing(null)}
                />
            )}
        </div>
    )
}

export default Binder
