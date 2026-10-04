import type {MouseEvent} from 'react'
import {useState} from 'react'
import {useAtom, useAtomValue, useStore} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {notifyingStorage} from '@lib/storage/observableStorage.ts'
import {BookDashed, SquareDashedText} from 'lucide-react'
import './Library.css'
import Binder from '@features/Binder/Binder.tsx'
import {activePageAtom, pagePrefix, pagesAtom} from '@features/Binder/binderAtoms.ts'
import {libraryLocation} from '@lib/navigation/navigation.ts'
import {useLocation, useNavigate} from '@hooks/useNavigation.ts'
import {tabHue} from '@lib/colors/tabHue.ts'
import {compareByLabel} from '@lib/sorting/compareByLabel.ts'
import {newId} from '@lib/ids/newId.ts'
import IconButton from '@ui/IconButton/IconButton'
import RouteLink from '@ui/RouteLink/RouteLink.tsx'
import ConfirmModal from '@ui/ConfirmModal/ConfirmModal'
import AddBinderModal from './modals/AddBinderModal.tsx'
import EditBinderModal from './modals/EditBinderModal.tsx'
import LibraryBinder from './LibraryBinder.tsx'
import {binderTabs} from './logic/binderTabs/binderTabs.ts'
import StorageControls from '@features/Storage/StorageControls.tsx'
import MarkdownTemplatesModal from '@features/Templates/MarkdownTemplatesModal.tsx'
import BinderTemplatesModal from '@features/Templates/BinderTemplatesModal.tsx'
import {binderTemplatesAtom, seedMarkdownContent} from '@features/Templates/templateAtoms.ts'
import {instantiateBinderTemplate} from '@features/Templates/logic/instantiate/instantiate.ts'

/**
 * A binder in the library: an opaque id (also the storage-prefix root every one of its pages persists under), a
 * display label, and the hue of its spine on the shelf.
 */
interface LibraryBinderItem {
    id: string
    label: string
    hue: number
}

/** The user's binders, loaded from and persisted to storage. Empty until the user adds one. */
const bindersAtom = atomWithStorage<LibraryBinderItem[]>('binders', [], notifyingStorage<LibraryBinderItem[]>())

/**
 * One binder cover on the shelf, subscribed to that binder's persisted pages and last-active page so its decorative
 * tabs stay in sync and opening it returns to the remembered page.
 */
function LibraryShelfBinder({binder, onOpen, onEdit, onDelete}: {
    binder: LibraryBinderItem
    onOpen: (activePageId: string) => void
    onEdit: () => void
    onDelete: (event: MouseEvent) => void
}) {
    const pages = useAtomValue(pagesAtom(binder.id))
    const rememberedPage = useAtomValue(activePageAtom(binder.id))
    return (
        <LibraryBinder
            hue={binder.hue}
            label={binder.label}
            jitterSeed={binder.id}
            // Decorative tabs mirror the binder's real pages (first four only), in their stored hue/label.
            tabs={binderTabs(pages).slice(0, 4)}
            onOpen={() => onOpen(rememberedPage)}
            onEdit={onEdit}
            onDelete={onDelete}
        />
    )
}

/**
 * The library: a grid of binder covers to open, add, rename, recolour, and delete. Opening one hands off to the
 * `Binder` bound to that binder's id as its storage prefix; a control there returns to the grid.
 */
function Library() {
    const [binders, setBinders] = useAtom(bindersAtom)
    const binderTemplates = useAtomValue(binderTemplatesAtom)
    const store = useStore()
    const location = useLocation()
    const navigate = useNavigate()
    const openId = location.binderId
    const [adding, setAdding] = useState(false)
    // Which template manager is open, if any.
    const [managing, setManaging] = useState<'markdown' | 'binder' | null>(null)
    // The binder targeted by the open edit or delete dialogue, if any.
    const [editing, setEditing] = useState<LibraryBinderItem | null>(null)
    const [deleting, setDeleting] = useState<LibraryBinderItem | null>(null)
    const open = binders.find((binder) => binder.id === openId)
    // Displayed in name order (case-insensitive); the stored list keeps its own order for stable default hues.
    const sorted = [...binders].sort(compareByLabel)

    // Adds a binder with a fresh id and a spread-out default spine hue; when built from a template, its tabs (and any
    // markdown content seeded from referenced templates) are created up front. The shelf stays open so it appears.
    function createBinder(name: string, fromTemplateId?: string) {
        const id = newId()
        setBinders([...binders, {id, label: name, hue: tabHue(binders.length)}])
        const template = fromTemplateId ? binderTemplates.find((candidate) => candidate.id === fromTemplateId) : undefined
        if (template) {
            const {pages, seeds} = instantiateBinderTemplate(template, newId)
            store.set(pagesAtom(id), pages)
            for (const seed of seeds) {
                seedMarkdownContent(store, pagePrefix(id, seed.pageId), seed.markdownTemplateId)
            }
            store.set(activePageAtom(id), pages[0]?.id ?? '')
        }
        setAdding(false)
    }

    // Renames and recolours the binder being edited (its id and stored pages are unchanged).
    function saveBinder(name: string, hue: number) {
        setBinders((previous) => previous.map((binder) => (binder.id === editing?.id ? {
            ...binder,
            label: name,
            hue
        } : binder)))
        setEditing(null)
    }

    // Removes the given binder from the library.
    function removeBinder(id: string) {
        setBinders((previous) => previous.filter((binder) => binder.id !== id))
        setDeleting(null)
    }

    if (open) return <Binder key={open.id} storagePrefix={open.id} onExit={() => navigate(libraryLocation())}/>

    return (
        <div className="library">
            <div className="library__grid">
                {sorted.map((binder) => (
                    <LibraryShelfBinder
                        key={binder.id}
                        binder={binder}
                        // Reopen the binder at its remembered active page.
                        onOpen={(activePageId) => navigate({binderId: binder.id, pageId: activePageId})}
                        onEdit={() => setEditing(binder)}
                        onDelete={(event) => (event.shiftKey ? removeBinder(binder.id) : setDeleting(binder))}
                    />
                ))}
                {/* Ghost binder in the last cell: a faded copy of the real binder look that opens the add dialogue. */}
                <LibraryBinder ghost hue={30} label="Add binder" jitterSeed="library-add"
                               onOpen={() => setAdding(true)}/>
            </div>

            <StorageControls placement="library"/>

            <nav className="library__legal no-print">
                <RouteLink route="privacy" className="library__legal-link">Privacy</RouteLink>
                <RouteLink route="terms" className="library__legal-link">Terms</RouteLink>
            </nav>

            <div className="library__templates corner-cluster no-print">
                <IconButton icon={<SquareDashedText/>} label="Page templates" labelSide="left"
                            onClick={() => setManaging('markdown')}/>
                <IconButton icon={<BookDashed/>} label="Binder templates" labelSide="left"
                            onClick={() => setManaging('binder')}/>
            </div>

            {managing === 'markdown' && <MarkdownTemplatesModal onClose={() => setManaging(null)}/>}
            {managing === 'binder' && <BinderTemplatesModal onClose={() => setManaging(null)}/>}

            {adding && <AddBinderModal onCreate={createBinder} onCancel={() => setAdding(false)}/>}
            {editing && (
                <EditBinderModal initialLabel={editing.label} initialHue={editing.hue} onSave={saveBinder}
                                 onCancel={() => setEditing(null)}/>
            )}
            {deleting && (
                <ConfirmModal
                    title="Delete binder"
                    message={`Delete “${deleting.label}”? The binder and every page in it will be removed, which cannot be undone.`}
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={() => removeBinder(deleting.id)}
                    onCancel={() => setDeleting(null)}
                />
            )}
        </div>
    )
}

export default Library
