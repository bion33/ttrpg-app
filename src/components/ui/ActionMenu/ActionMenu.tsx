import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {Ellipsis, type LucideIcon} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton.tsx'
import './ActionMenu.css'

/**
 * One command in an "…" menu: its menu label and icon, whether it is destructive (styled as such), and a handler that
 * applies it.
 */
export interface ActionMenuItem {
    id: string
    label: string
    icon: LucideIcon
    destructive?: boolean
    run: () => void
}

/**
 * Props for an "…" menu: its accessible label, the actions it offers, and how its popup aligns to the trigger.
 */
interface ActionMenuProps {
    label: string
    actions: ActionMenuItem[]
    align?: 'start' | 'center' | 'end'
}

/**
 * The shared "…" dropdown: a trigger button opening a menu of actions. Built on Radix `DropdownMenu` for keyboard
 * navigation, ARIA roles, and zoom-aware (portalled, fixed) positioning.
 */
function ActionMenu({label, actions, align = 'end'}: ActionMenuProps) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <IconButton icon={<Ellipsis/>} label={label} size="small" appearance="flat" contentEditable={false}/>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content className="menu menu__list" align={align} sideOffset={4}
                                      onCloseAutoFocus={(event) => event.preventDefault()}>
                    {actions.map((action) => {
                        const ActionIcon = action.icon
                        return (
                            <DropdownMenu.Item key={action.id} onSelect={() => action.run()}
                                               className={'menu__item' +
                                                   (action.destructive ? ' menu__item--danger' : '')}>
                                <ActionIcon size={16}/> {action.label}
                            </DropdownMenu.Item>
                        )
                    })}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}

export default ActionMenu
