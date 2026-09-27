import {Palette, Pencil, Plus, Trash2} from 'lucide-react'
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
 * tab — rename, recolour, and delete.
 */
function TabControls({onAdd, hasActive, onRename, onRecolor, onDelete}: TabControlsProps) {
    return (
        <div className="tab-controls">
            <IconButton icon={<Plus/>} label="Add page" onClick={onAdd}/>
            {hasActive && (
                <>
                    <IconButton icon={<Pencil/>} label="Rename" onClick={onRename}/>
                    <IconButton icon={<Palette/>} label="Colour" onClick={onRecolor}/>
                    <IconButton icon={<Trash2/>} label="Delete" variant="danger" onClick={onDelete}/>
                </>
            )}
        </div>
    )
}

export default TabControls
