import type {MouseEvent} from 'react'
import {PencilLine, Plus, SquarePen, Trash2} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'
import {compareByLabel} from '@lib/sorting/compareByLabel.ts'
import './Templates.css'

/**
 * One listed item: an opaque id and its display label.
 */
interface ManagerItem {
    id: string
    label: string
}

/**
 * Props for the shared manager list: the items to show, the open/rename/delete actions on each (open uses `openLabel`
 * for its accessible name; delete is given the click event so a caller can skip its confirmation on a modified click),
 * and the add action with its label; `emptyText` shows when there are no items.
 */
interface ManagerListProps {
    items: ManagerItem[]
    openLabel: string
    onOpen: (id: string) => void
    onRename: (id: string) => void
    onDelete: (id: string, event: MouseEvent) => void
    addLabel: string
    onAdd: () => void
    emptyText: string
}

/**
 * The shared list body of a template manager: a row per item with open, rename, and delete, plus an add button —
 * reused by the markdown-template and binder-template managers so they stay uniform.
 */
function ManagerList({items, openLabel, onOpen, onRename, onDelete, addLabel, onAdd, emptyText}: ManagerListProps) {
    // Shown in name order (case-insensitive); the stored order is left untouched.
    const sorted = [...items].sort(compareByLabel)
    return (
        <div className="template-list">
            {items.length === 0 && <p className="template-list__empty">{emptyText}</p>}
            {sorted.map((item) => (
                <div key={item.id} className="template-list__row">
                    <span className="template-list__label">{item.label}</span>
                    <div className="template-list__actions">
                        <IconButton icon={<PencilLine/>} label="Rename" size="small" labelSide="left"
                                    onClick={() => onRename(item.id)}/>
                        <IconButton icon={<SquarePen/>} label={openLabel} size="small" labelSide="left"
                                    onClick={() => onOpen(item.id)}/>
                        <IconButton icon={<Trash2/>} label="Delete" size="small" labelSide="left" variant="danger"
                                    onClick={(event) => onDelete(item.id, event)}/>
                    </div>
                </div>
            ))}
            <button type="button" className="template-list__add" onClick={onAdd}>
                <Plus/>
                <span>{addLabel}</span>
            </button>
        </div>
    )
}

export default ManagerList
