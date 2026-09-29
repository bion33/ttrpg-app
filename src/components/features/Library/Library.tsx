import type {CSSProperties} from 'react'
import {useState} from 'react'
import {useAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {Pencil, Plus, Trash2} from 'lucide-react'
import './Library.css'
import '../Binder/tabs/Tabs.css'
import Binder from '../Binder/Binder.tsx'
import {tabHue} from '../Binder/logic/tabHue.ts'
import IconButton from '../../ui/IconButton/IconButton'
import {AddBinderModal} from './modals/AddBinderModal.tsx'
import {EditBinderModal} from './modals/EditBinderModal.tsx'
import {DeleteBinderModal} from './modals/DeleteBinderModal.tsx'
import {binderId} from './logic/binderId.ts'
import {bookJitter} from './logic/bookJitter.ts'
import {binderTabs} from './logic/binderTabs.ts'

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
 * The library: a grid of binder covers to open, add, rename, recolour, and delete. Opening one hands off to the
 * `Binder` bound to that binder's id as its storage prefix; a control there returns to the grid.
 */
function Library() {
    const [binders, setBinders] = useAtom(bindersAtom)
    const [openId, setOpenId] = useAtom(openBinderAtom)
    const [adding, setAdding] = useState(false)
    // The binder targeted by the open edit or delete dialogue, if any.
    const [editing, setEditing] = useState<LibraryBinder | null>(null)
    const [deleting, setDeleting] = useState<LibraryBinder | null>(null)
    const open = binders.find((binder) => binder.id === openId)
    // Displayed in name order (case-insensitive); the stored list keeps its own order for stable default hues.
    const sorted = [...binders].sort((a, b) => a.label.localeCompare(b.label, undefined, {sensitivity: 'base'}))

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
            <div className="library__grid">
                {sorted.map((binder) => {
                    const jitter = bookJitter(binder.id)
                    // Decorative tabs mirror the binder's real pages (first four only), in their stored hue/label.
                    const tabs = binderTabs(localStorage.getItem(`${binder.id}:pages`)).slice(0, 4)
                    return (
                        <div key={binder.id} className="library__book" style={{'--hue': binder.hue} as CSSProperties}>
                            {/* Loose sheets peeking out behind the cover, each tilted and offset for a messy look. */}
                            <div className="library__papers" aria-hidden="true">
                                {jitter.papers.map((paper, i) => (
                                    <span key={i} className="library__paper"
                                          style={{
                                              '--dx': `${paper.dx}rem`, '--dy': `${paper.dy}rem`,
                                              '--rot': `${paper.rot}deg`
                                          } as CSSProperties}/>
                                ))}
                            </div>
                            {/* Decorative, non-functional binder tabs: the real page-tab strip markup, scaled down. */}
                            <div className="library__tabs" aria-hidden="true">
                                <div className="tabs">
                                    {tabs.map((tab, i) => (
                                        <div key={i} className="tabs__tab" style={{'--hue': tab.hue} as CSSProperties}>
                                            <span className="tabs__label">{tab.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
                    )
                })}
                {/* Ghost binder in the last cell: a faded copy of the real binder look that opens the add dialogue. */}
                <div className="library__book library__book--ghost" style={{'--hue': 30} as CSSProperties}>
                    <div className="library__papers" aria-hidden="true">
                        {bookJitter('library-add').papers.map((paper, i) => (
                            <span key={i} className="library__paper"
                                  style={{
                                      '--dx': `${paper.dx}rem`, '--dy': `${paper.dy}rem`,
                                      '--rot': `${paper.rot}deg`
                                  } as CSSProperties}/>
                        ))}
                    </div>
                    <button type="button" className="library__cover" onClick={() => setAdding(true)}>
                            <span className="library__portrait" aria-hidden="true">
                                <Plus/>
                            </span>
                        <span className="library__cover-name">Add binder</span>
                    </button>
                </div>
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
