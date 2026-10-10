import {useState} from 'react'
import type {Editor} from '@tiptap/core'
import type {LucideIcon} from 'lucide-react'
import type {BlockAction} from '../blocks/insertBlocks.ts'
import BlockActionsMenu from '../blocks/BlockActionsMenu.tsx'

/**
 * Props for a toolbar dropdown: the editor it drives, its default (no-active-member) label/icon, the grouped actions,
 * and their active flags.
 */
interface ToolbarDropdownProps {
    editor: Editor
    label: string
    icon: LucideIcon
    actions: BlockAction[]
    activeStates: boolean[]
}

/**
 * A toolbar dropdown grouping related block actions; its trigger shows the active action's icon, else the group icon.
 * The menu itself is the shared searchable `BlockActionsMenu`.
 */
function ToolbarDropdown({editor, label, icon: GroupIcon, actions, activeStates}: ToolbarDropdownProps) {
    const [open, setOpen] = useState(false)
    const activeIndex = activeStates.findIndex(Boolean)
    const TriggerIcon = activeIndex >= 0 ? actions[activeIndex].icon : GroupIcon

    return (
        <BlockActionsMenu editor={editor} actions={actions} open={open} onOpenChange={setOpen} side="top"
                          onRunAction={(action) => action.run?.(editor)}
                          trigger={
                              <button type="button" aria-label={label} data-tooltip={label}
                                      className={'markdown-toolbar__btn markdown-toolbar__btn--menu has-tooltip ' +
                                          'has-tooltip--top' + (activeIndex >= 0 ? ' is-active' : '')}>
                                  <TriggerIcon size={16}/> <span aria-hidden="true">▾</span>
                              </button>
                          }/>
    )
}

export default ToolbarDropdown
