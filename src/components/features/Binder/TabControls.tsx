import type {MouseEvent} from 'react'
import {useEffect, useState} from 'react'
import {ArrowUp, Library, Pencil, Plus, Printer, Trash2} from 'lucide-react'
import IconButton from '../../ui/IconButton/IconButton'
import './TabControls.css'

/**
 * Props for the tab controls: adding a page and returning to the library (`onExit`) are always available; editing and
 * deleting act on the active tab and are offered only when `hasActive` is true. `lastTab` is the tab whose visibility
 * gates the back-to-top button.
 */
interface TabControlsProps {
    onAdd: () => void
    hasActive: boolean
    onEdit: () => void
    onDelete: (event: MouseEvent<HTMLButtonElement>) => void
    onExit: () => void
    lastTab: HTMLElement | null
}

/**
 * The binder's fixed on-screen controls: a back-to-library button in the top-left corner, and a bottom-corner cluster
 * to add a page and print (always shown) plus — for the active tab — edit (rename and recolour) and delete. A
 * back-to-top button appears once the last tab scrolls out of view.
 */
function TabControls({onAdd, hasActive, onEdit, onDelete, onExit, lastTab}: TabControlsProps) {
    const [scrolledPast, setScrolledPast] = useState(false)

    // Watch whether the last tab is still on screen so the back-to-top button can appear when it is not.
    useEffect(() => {
        if (!lastTab) {
            setScrolledPast(false)
            return
        }
        const observer = new IntersectionObserver(([entry]) => setScrolledPast(!entry.isIntersecting))
        observer.observe(lastTab)
        return () => observer.disconnect()
    }, [lastTab])

    return (
        <>
            <div className="tab-controls__library">
                <IconButton icon={<Library/>} label="Back to library" labelSide="right" onClick={onExit}/>
            </div>
            <div className="tab-controls">
                <IconButton icon={<Plus/>} label="Add tab" onClick={onAdd}/>
                {hasActive && (
                    <>
                        <IconButton icon={<Pencil/>} label="Edit tab" onClick={onEdit}/>
                        <IconButton icon={<Printer/>} label="Print" onClick={() => window.print()}/>
                        <IconButton icon={<Trash2/>} label="Delete tab" variant="danger"
                                    onClick={onDelete}/>
                    </>
                )}
            </div>
            <div className={`tab-controls__to-top${scrolledPast ? ' tab-controls__to-top--visible' : ''}`}>
                <IconButton icon={<ArrowUp/>} label="Back to top"
                            onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}/>
            </div>
        </>
    )
}

export default TabControls
