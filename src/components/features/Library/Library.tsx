import type {CSSProperties} from 'react'
import {useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {Pencil, Plus, Trash2} from 'lucide-react'
import './Library.css'
import Binder from '../Binder/Binder.tsx'
import {tabHue} from '../Binder/logic/tabHue.ts'
import IconButton from '../../ui/IconButton/IconButton'
import {AddBinderModal, DeleteBinderModal, EditBinderModal} from './BinderDialogs.tsx'
import {binderId} from './logic/binderId.ts'

/**
 * A binder in the library: an opaque id (also the storage-prefix root every one of its pages persists under), a
 * display label, and the hue of its spine on the shelf.
 */
interface LibraryBinder {
    id: string
    label: string
    hue: number
}

/** The user's binders, loaded from and persisted to storage. Empty until the user adds one. */
const bindersAtom = atomWithStorage<LibraryBinder[]>('binders', [])

/** The id of the binder currently open (empty string for the shelf view), persisted so a reload reopens it. */
const openBinderAtom = atomWithStorage('openBinder', '')

/**
 * The library shelf: a grid of binder covers to open, add, rename, recolour, and delete. Opening one hands off to the
 * `Binder` bound to that binder's id as its storage prefix; a control there returns to this shelf.
 */
function Library() {
    const [binders, setBinders] = useAtom(bindersAtom)
    const [openId, setOpenId] = useAtom(openBinderAtom)
    const [adding, setAdding] = useState(false)
    // The binder targeted by the open edit or delete dialogue, if any.
    const [editing, setEditing] = useState<LibraryBinder | null>(null)
    const [deleting, setDeleting] = useState<LibraryBinder | null>(null)
    const open = binders.find((binder) => binder.id === openId)

    // Adds a binder with a fresh id and a spread-out default spine hue; the shelf stays open so the new book appears.
    function createBinder(name: string) {
        setBinders([...binders, {id: binderId(), label: name, hue: tabHue(binders.length)}])
        setAdding(false)
    }

    // Renames and recolours the binder being edited (its id and stored pages are unchanged).
    function saveBinder(name: string, hue: number) {
        setBinders((prev) => prev.map((binder) => (binder.id === editing?.id ? {...binder, label: name, hue} : binder)))
        setEditing(null)
    }

    // Removes the given binder from the library.
    function removeBinder(id: string) {
        setBinders((prev) => prev.filter((binder) => binder.id !== id))
        setDeleting(null)
    }

    if (open) return <Binder key={open.id} storagePrefix={open.id} onExit={() => setOpenId('')}/>

    return (
        <div className="library">
            <h1 className="library__title">Library</h1>
            {binders.length === 0 ? (
                <p className="library__empty">No binders yet. Add one with the button in the corner.</p>
            ) : (
                <div className="library__shelf">
                    {binders.map((binder) => (
                        <div key={binder.id} className="library__book" style={{'--hue': binder.hue} as CSSProperties}>
                            <button type="button" className="library__cover" onClick={() => setOpenId(binder.id)}>
                                <span className="library__portrait" aria-hidden="true">
                                    {binder.label.trim().charAt(0).toUpperCase()}
                                </span>
                                <span className="library__cover-name">{binder.label}</span>
                            </button>
                            <div className="library__book-actions">
                                <IconButton icon={<Pencil/>} label="Edit binder" labelSide="right"
                                            onClick={() => setEditing(binder)}/>
                                <IconButton icon={<Trash2/>} label="Delete binder" labelSide="right" variant="danger"
                                            onClick={(event) =>
                                                event.shiftKey ? removeBinder(binder.id) : setDeleting(binder)}/>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="library__controls">
                <IconButton icon={<Plus/>} label="Add binder" onClick={() => setAdding(true)}/>
            </div>

            {adding && <AddBinderModal onCreate={createBinder} onCancel={() => setAdding(false)}/>}
            {editing && (
                <EditBinderModal initialLabel={editing.label} initialHue={editing.hue} onSave={saveBinder}
                                 onCancel={() => setEditing(null)}/>
            )}
            {deleting && (
                <DeleteBinderModal label={deleting.label} onConfirm={() => removeBinder(deleting.id)}
                                   onCancel={() => setDeleting(null)}/>
            )}
        </div>
    )
}

export default Library
