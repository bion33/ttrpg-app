import type {CSSProperties} from 'react'
import {useState} from 'react'
import {useAtom, useAtomValue} from 'jotai'
import {ArrowLeft, GripVertical, Pencil, Plus, Trash2} from 'lucide-react'
import Modal from '@ui/Modal/Modal'
import IconButton from '@ui/IconButton/IconButton'
import ConfirmBody from '@ui/ConfirmModal/ConfirmBody.tsx'
import AddTabForm from '@features/Binder/tabs/modals/AddTabForm.tsx'
import EditTabForm from '@features/Binder/tabs/modals/EditTabForm.tsx'
import {PAGE_TYPES, type PageType} from '@features/Binder/pageTypes.ts'
import {binderTemplatesAtom, markdownTemplatesAtom} from './templateAtoms.ts'
import type {BinderTemplatePage} from './templateTypes.ts'
import {tabHue} from '@lib/colors/tabHue.ts'
import {tabBorderColor, tabColor} from '@lib/colors/hueColors.ts'
import {newId} from '@lib/ids/newId.ts'
import {useDragReorder} from '@hooks/useDragReorder.ts'

/**
 * Props for the binder-template tab-list editor: which template's pages are edited, its label for the dialog title, and
 * the callbacks returning to the templates list and closing the manager.
 */
interface BinderTemplatePagesEditorProps {
    templateId: string
    label: string
    onBack: () => void
    onClose: () => void
}

// The human label for a page type, for a row's secondary line.
function typeLabel(type: PageType): string {
    return PAGE_TYPES.find((option) => option.value === type)?.label ?? type
}

/**
 * The tab-list editor for one binder template: a plain ordered list of its structural tabs with reorder, edit (label
 * and hue), delete, and add — no page content is authored here, only the binder's shape. Adding swaps the dialog body
 * in place rather than stacking a second modal.
 */
function BinderTemplatePagesEditor({templateId, label, onBack, onClose}: BinderTemplatePagesEditorProps) {
    const [templates, setTemplates] = useAtom(binderTemplatesAtom)
    const markdownTemplates = useAtomValue(markdownTemplatesAtom)
    const [addingTab, setAddingTab] = useState(false)
    // The tab targeted by the open edit or delete dialogue, if any.
    const [editingTab, setEditingTab] = useState<string | null>(null)
    const [deletingTab, setDeletingTab] = useState<string | null>(null)
    const pages = templates.find((template) => template.id === templateId)?.pages ?? []
    const editingPage = pages.find((page) => page.id === editingTab)
    const deletingPage = pages.find((page) => page.id === deletingTab)

    // Replaces the edited template's pages via the given transform, persisting the new structure.
    function updatePages(transform: (pages: BinderTemplatePage[]) => BinderTemplatePage[]) {
        setTemplates((previous) => previous.map((template) =>
            (template.id === templateId ? {...template, pages: transform(template.pages)} : template)))
    }

    function addTab(name: string, type: PageType, markdownTemplateId?: string) {
        updatePages((previous) => [...previous,
            {id: newId(), label: name, type, hue: tabHue(previous.length), markdownTemplateId}])
        setAddingTab(false)
    }

    function editTab(label: string, hue: number) {
        updatePages((previous) => previous.map((page) => (page.id === editingTab ? {...page, label, hue} : page)))
        setEditingTab(null)
    }

    function deleteTab(id: string) {
        updatePages((previous) => previous.filter((page) => page.id !== id))
        setDeletingTab(null)
    }

    // Moves the tab from index `from` to index `to`, persisting the new order.
    function reorderTabs(from: number, to: number) {
        updatePages((previous) => {
            const next = previous.slice()
            const [moved] = next.splice(from, 1)
            next.splice(to, 0, moved)
            return next
        })
    }

    const {registerItem, startDrag, onPointerMove, onPointerUp, itemTransform, draggingIndex, committing}
        = useDragReorder(pages.length, reorderTabs)

    // The add/edit/delete flows each swap the whole dialog body in place; their own buttons return to the tab list.
    if (addingTab) {
        return (
            <Modal title="Add tab" onClose={onClose}>
                <AddTabForm onCreate={addTab} onCancel={() => setAddingTab(false)}/>
            </Modal>
        )
    }
    if (editingPage) {
        return (
            <Modal title="Edit tab" onClose={onClose}>
                <EditTabForm initialLabel={editingPage.label} initialHue={editingPage.hue} onSave={editTab}
                             onCancel={() => setEditingTab(null)}/>
            </Modal>
        )
    }
    if (deletingPage) {
        return (
            <Modal title="Delete tab" onClose={onClose}>
                <ConfirmBody
                    message={`Remove “${deletingPage.label}” from this template?`}
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={() => deleteTab(deletingPage.id)}
                    onCancel={() => setDeletingTab(null)}
                />
            </Modal>
        )
    }

    return (
        <Modal title={`Edit “${label}”`} onClose={onClose}>
            <div className="modal__body">
                <button type="button" className="template-list__back" onClick={onBack}>
                    <ArrowLeft size={16}/> Templates
                </button>
                <div className="template-list">
                    {pages.length === 0 && <p className="template-list__empty">No tabs yet.</p>}
                    {pages.map((page, index) => {
                        const source = page.markdownTemplateId
                            ? markdownTemplates.find((template) => template.id === page.markdownTemplateId)
                            : undefined
                        return (
                            <div key={page.id} ref={registerItem(index)} className="template-list__row"
                                 style={{
                                     '--row-color': tabColor(page.hue),
                                     '--row-border': tabBorderColor(page.hue),
                                     transform: itemTransform(index),
                                     // The dragged row follows the pointer with no easing; on drop every row snaps
                                     // to its reordered slot for one frame; otherwise displaced rows keep the glide.
                                     transition: index === draggingIndex || committing ? 'none' : undefined,
                                     zIndex: index === draggingIndex ? 1 : undefined,
                                 } as CSSProperties}>
                                <span className="template-list__grip" aria-hidden
                                      onPointerDown={(event) => startDrag(event, index)}
                                      onPointerMove={onPointerMove}
                                      onPointerUp={onPointerUp}>
                                    <GripVertical/>
                                </span>
                                <div className="template-list__text">
                                    <span className="template-list__label">{page.label}</span>
                                    <span className="template-list__meta">
                                        {typeLabel(page.type)}
                                        {page.type === 'markdown' && (source ? ` · from ${source.label}` : ' · blank')}
                                    </span>
                                </div>
                                <div className="template-list__actions">
                                    <IconButton icon={<Pencil/>} label="Edit tab" size="small" labelSide="left"
                                                onClick={() => setEditingTab(page.id)}/>
                                    <IconButton icon={<Trash2/>} label="Delete tab" size="small" labelSide="left"
                                                variant="danger"
                                                onClick={(event) => (event.shiftKey ? deleteTab(page.id) : setDeletingTab(page.id))}/>
                                </div>
                            </div>
                        )
                    })}
                    <button type="button" className="template-list__add" onClick={() => setAddingTab(true)}>
                        <Plus/>
                        <span>Add tab</span>
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default BinderTemplatePagesEditor
