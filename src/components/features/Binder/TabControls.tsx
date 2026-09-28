import {useEffect, useRef, useState} from 'react'
import {ArrowUp, Palette, Pencil, Plus, Trash2} from 'lucide-react'
import IconButton from '../../ui/IconButton/IconButton'
import './TabControls.css'

/**
 * Props for the tab-control cluster: adding a page is always available; renaming, recolouring and deleting act on
 * the active tab and are offered only when `hasActive` is true.
 */
interface TabControlsProps {
    onAdd: () => void
    hasActive: boolean
    onRename: () => void
    onRecolor: () => void
    onDelete: () => void
}

/**
 * A vertical cluster of round icon buttons beside the tab strip: add a page (always shown), and — for the active
 * tab — rename, recolour, and delete. A back-to-top button appears once the cluster scrolls out of view.
 */
function TabControls({onAdd, hasActive, onRename, onRecolor, onDelete}: TabControlsProps) {
    const clusterRef = useRef<HTMLDivElement>(null)
    const [scrolledPast, setScrolledPast] = useState(false)

    // Watch whether the cluster is still on screen so the back-to-top button can appear when it is not.
    useEffect(() => {
        const cluster = clusterRef.current
        if (!cluster) return
        const observer = new IntersectionObserver(([entry]) => setScrolledPast(!entry.isIntersecting))
        observer.observe(cluster)
        return () => observer.disconnect()
    }, [])

    return (
        <>
            <div className="tab-controls" ref={clusterRef}>
                <IconButton icon={<Plus/>} label="Add page" onClick={onAdd}/>
                {hasActive && (
                    <>
                        <IconButton icon={<Pencil/>} label="Rename" onClick={onRename}/>
                        <IconButton icon={<Palette/>} label="Colour" onClick={onRecolor}/>
                        <IconButton icon={<Trash2/>} label="Delete" variant="danger" onClick={onDelete}/>
                    </>
                )}
            </div>
            {scrolledPast && (
                <div className="tab-controls__to-top">
                    <IconButton icon={<ArrowUp/>} label="Back to top"
                                onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}/>
                </div>
            )}
        </>
    )
}

export default TabControls
