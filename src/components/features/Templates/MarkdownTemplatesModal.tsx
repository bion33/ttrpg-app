import {useState} from 'react'
import {useAtom, useStore} from 'jotai'
import Modal from '@ui/Modal/Modal'
import ConfirmBody from '@ui/ConfirmModal/ConfirmBody.tsx'
import ManagerList from './ManagerList.tsx'
import NameForm from './NameForm.tsx'
import {clearMarkdownTemplateContent, markdownTemplatesAtom} from './templateAtoms.ts'
import {useNavigate} from '@hooks/useNavigation.ts'
import {markdownTemplateLocation} from '@lib/navigation/navigation.ts'
import {newId} from '@lib/ids/newId.ts'

/**
 * Props for the markdown-templates manager: the close callback.
 */
interface MarkdownTemplatesModalProps {
    onClose: () => void
}

// Which sub-view fills the modal body: the list, or the add/rename/delete form for a template.
type View = { kind: 'list' } | { kind: 'add' } | { kind: 'rename'; id: string } | { kind: 'delete'; id: string }

/**
 * The markdown-templates manager: lists the templates with add, rename, delete, and edit (opening the template's editor
 * surface). Add, rename, and delete swap the modal body in place rather than stacking a second dialogue.
 */
function MarkdownTemplatesModal({onClose}: MarkdownTemplatesModalProps) {
    const [templates, setTemplates] = useAtom(markdownTemplatesAtom)
    const store = useStore()
    const navigate = useNavigate()
    const [view, setView] = useState<View>({kind: 'list'})
    const backToList = () => setView({kind: 'list'})
    const targetId = view.kind === 'rename' || view.kind === 'delete' ? view.id : null
    const target = templates.find((template) => template.id === targetId)

    function addTemplate(label: string) {
        setTemplates([...templates, {id: newId(), label}])
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
        clearMarkdownTemplateContent(store, id)
        backToList()
    }

    if (view.kind === 'add') {
        return (
            <Modal title="New page template" onClose={onClose}>
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
            <Modal title="Delete template" onClose={onClose}>
                <ConfirmBody
                    message={`If you delete “${target.label}”, it can no longer be used to create new pages. Existing pages created via this template are unaffected.`}
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={() => deleteTemplate(target.id)}
                    onCancel={backToList}
                />
            </Modal>
        )
    }

    return (
        <Modal title="Page templates" onClose={onClose}>
            <div className="modal__body">
                <ManagerList
                    items={templates}
                    openLabel="Edit"
                    onOpen={(id) => navigate(markdownTemplateLocation(id))}
                    onRename={(id) => setView({kind: 'rename', id})}
                    onDelete={(id, event) => (event.shiftKey ? deleteTemplate(id) : setView({kind: 'delete', id}))}
                    addLabel="New template"
                    onAdd={() => setView({kind: 'add'})}
                    emptyText="No page templates yet."
                />
            </div>
        </Modal>
    )
}

export default MarkdownTemplatesModal
