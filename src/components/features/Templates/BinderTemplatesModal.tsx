import {useState} from 'react'
import {useAtom} from 'jotai'
import Modal from '@ui/Modal/Modal'
import ConfirmBody from '@ui/ConfirmModal/ConfirmBody.tsx'
import ManagerList from './ManagerList.tsx'
import NameForm from './NameForm.tsx'
import BinderTemplatePagesEditor from './BinderTemplatePagesEditor.tsx'
import {binderTemplatesAtom} from './templateAtoms.ts'
import {newId} from '@lib/ids/newId.ts'

/**
 * Props for the binder-templates manager: the close callback.
 */
interface BinderTemplatesModalProps {
    onClose: () => void
}

// Which sub-view fills the modal body: the list, the add/rename/delete form, or one template's tab editor.
type View =
    | { kind: 'list' }
    | { kind: 'add' }
    | { kind: 'rename'; id: string }
    | { kind: 'delete'; id: string }
    | { kind: 'edit'; id: string }

/**
 * The binder-templates manager: a list of reusable binder structures (add, rename, delete, edit) whose sub-views swap
 * the modal body in place rather than stacking a second dialogue. Structure only — no page content is authored here.
 */
function BinderTemplatesModal({onClose}: BinderTemplatesModalProps) {
    const [templates, setTemplates] = useAtom(binderTemplatesAtom)
    const [view, setView] = useState<View>({kind: 'list'})
    const backToList = () => setView({kind: 'list'})
    const targetId = view.kind === 'rename' || view.kind === 'delete' || view.kind === 'edit' ? view.id : null
    const target = templates.find((template) => template.id === targetId)

    function addTemplate(label: string) {
        setTemplates([...templates, {id: newId(), label, pages: []}])
        backToList()
    }

    function renameTemplate(label: string) {
        setTemplates((previous) => previous.map((template) => (template.id === targetId ? {
            ...template,
            label
        } : template)))
        backToList()
    }

    function deleteTemplate(id: string) {
        setTemplates((previous) => previous.filter((template) => template.id !== id))
        backToList()
    }

    if (view.kind === 'add') {
        return (
            <Modal title="New binder template" onClose={onClose}>
                <NameForm submitLabel="Create" onSubmit={addTemplate} onCancel={backToList}/>
            </Modal>
        )
    }
    if (view.kind === 'rename' && target) {
        return (
            <Modal title="Rename template" onClose={onClose}>
                <NameForm initialName={target.label} submitLabel="Save" onSubmit={renameTemplate}
                          onCancel={backToList}/>
            </Modal>
        )
    }
    if (view.kind === 'delete' && target) {
        return (
            <Modal title="Delete binder template" onClose={onClose}>
                <ConfirmBody
                    message={`Delete “${target.label}”? This cannot be undone. Binders already created from it are unaffected.`}
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={() => deleteTemplate(target.id)}
                    onCancel={backToList}
                />
            </Modal>
        )
    }
    // The tab-list editor owns its own dialog (title + back link), swapping to the add-tab form in place.
    if (view.kind === 'edit' && target) {
        return (
            <BinderTemplatePagesEditor templateId={target.id} label={target.label} onBack={backToList}
                                       onClose={onClose}/>
        )
    }

    return (
        <Modal title="Binder templates" onClose={onClose}>
            <div className="modal__body">
                <ManagerList
                    items={templates}
                    openLabel="Edit tabs"
                    onOpen={(id) => setView({kind: 'edit', id})}
                    onRename={(id) => setView({kind: 'rename', id})}
                    onDelete={(id, event) => (event.shiftKey ? deleteTemplate(id) : setView({kind: 'delete', id}))}
                    addLabel="New template"
                    onAdd={() => setView({kind: 'add'})}
                    emptyText="No binder templates yet."
                />
            </div>
        </Modal>
    )
}

export default BinderTemplatesModal
