import type {MouseEvent} from 'react'
import {FilePlus2, Pencil, Printer, Trash2} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'

/**
 * Props for the tab controls: adding a page is always available; editing and deleting act on the active tab and are
 * offered only when `hasActive` is true.
 */
interface TabControlsProps {
    onAdd: () => void
    hasActive: boolean
    onEdit: () => void
    onDelete: (event: MouseEvent<HTMLButtonElement>) => void
}

/**
 * The binder's page controls, rendered as a group within the surface sidebar: add a page and print (always shown) plus
 * — for the active tab — edit (rename and recolour) and delete.
 */
function TabControls({onAdd, hasActive, onEdit, onDelete}: TabControlsProps) {
    return (
        <div className="tab-controls control-group no-print">
            <IconButton icon={<FilePlus2/>} label="Add tab" onClick={onAdd}/>
            {hasActive && (
                <>
                    <IconButton icon={<Pencil/>} label="Edit tab" onClick={onEdit}/>
                    <IconButton icon={<Printer/>} label="Print" onClick={() => window.print()}/>
                    <IconButton icon={<Trash2/>} label="Delete tab" variant="danger" onClick={onDelete}/>
                </>
            )}
        </div>
    )
}

export default TabControls
