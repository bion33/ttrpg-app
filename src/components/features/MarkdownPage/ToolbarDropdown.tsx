import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type {Editor} from '@tiptap/core'
import type {LucideIcon} from 'lucide-react'
import type {BlockAction} from './blocks/insertBlocks.ts'

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
 * Built on Radix `DropdownMenu` for keyboard navigation, ARIA roles, focus management, and zoom-aware positioning.
 */
function ToolbarDropdown({editor, label, icon: GroupIcon, actions, activeStates}: ToolbarDropdownProps) {
    const activeIndex = activeStates.findIndex(Boolean)
    const TriggerIcon = activeIndex >= 0 ? actions[activeIndex].icon : GroupIcon

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button type="button" title={label}
                        className={'markdown-toolbar__btn markdown-toolbar__btn--menu' +
                            (activeIndex >= 0 ? ' is-active' : '')}><TriggerIcon size={16}/> <span aria-hidden="true">▾</span>
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content className="markdown-toolbar__menu" align="start" sideOffset={4}
                                      // Keep the caret in the editor after a command instead of returning focus here.
                                      onCloseAutoFocus={(event) => event.preventDefault()}>
                    {actions.map((action, index) => {
                        const ItemIcon = action.icon
                        return (
                            <DropdownMenu.Item key={action.id} onSelect={() => action.run(editor)}
                                               className={'markdown-toolbar__menu-item' +
                                                   (activeStates[index] ? ' is-active' : '')}>
                                <ItemIcon size={16}/> {action.label}
                            </DropdownMenu.Item>
                        )
                    })}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}

export default ToolbarDropdown
