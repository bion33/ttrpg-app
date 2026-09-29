import {useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import './Library.css'
import Binder from '../Binder/Binder.tsx'
import {activePage} from '../Binder/logic/activePage.ts'
import {libraryLocation} from '../../../lib/navigation.ts'
import {useLocation, useNavigate} from '../../../hooks/useNavigation.ts'
import {tabHue} from '../../../lib/tabHue.ts'
import ConfirmModal from '../../ui/ConfirmModal/ConfirmModal'
import AddBinderModal from './modals/AddBinderModal.tsx'
import EditBinderModal from './modals/EditBinderModal.tsx'
import LibraryBinder from './LibraryBinder.tsx'
import {binderId} from './logic/binderId.ts'
import {binderTabs} from './logic/binderTabs.ts'

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
const bindersAtom = atomWithStorage<LibraryBinderItem[]>('binders', [])

/**
 * The library: a grid of binder covers to open, add, rename, recolour, and delete. Opening one hands off to the
 * `Binder` bound to that binder's id as its storage prefix; a control there returns to the grid.
 */
function Library() {
    const [binders, setBinders] = useAtom(bindersAtom)
    const location = useLocation()
    const navigate = useNavigate()
    const openId = location.binderId
    const [adding, setAdding] = useState(false)
    // The binder targeted by the open edit or delete dialogue, if any.
    const [editing, setEditing] = useState<LibraryBinderItem | null>(null)
    const [deleting, setDeleting] = useState<LibraryBinderItem | null>(null)
    const open = binders.find((binder) => binder.id === openId)
    // Displayed in name order (case-insensitive); the stored list keeps its own order for stable default hues.
    const sorted = [...binders].sort((first, second) => first.label.localeCompare(second.label, undefined, {sensitivity: 'base'}))

    // Adds a binder with a fresh id and a spread-out default spine hue; the shelf stays open so the new binder appears.
    function createBinder(name: string) {
        setBinders([...binders, {id: binderId(), label: name, hue: tabHue(binders.length)}])
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
                    <LibraryBinder
                        key={binder.id}
                        hue={binder.hue}
                        label={binder.label}
                        jitterSeed={binder.id}
                        // Decorative tabs mirror the binder's real pages (first four only), in their stored hue/label.
                        tabs={binderTabs(localStorage.getItem(`${binder.id}:pages`)).slice(0, 4)}
                        // Reopen the binder at its remembered active page.
                        onOpen={() => navigate({
                            binderId: binder.id,
                            pageId: activePage(localStorage.getItem(`${binder.id}:activePage`)),
                        })}
                        onEdit={() => setEditing(binder)}
                        onDelete={(event) => (event.shiftKey ? removeBinder(binder.id) : setDeleting(binder))}
                    />
                ))}
                {/* Ghost binder in the last cell: a faded copy of the real binder look that opens the add dialogue. */}
                <LibraryBinder ghost hue={30} label="Add binder" jitterSeed="library-add"
                               onOpen={() => setAdding(true)}/>
            </div>

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
