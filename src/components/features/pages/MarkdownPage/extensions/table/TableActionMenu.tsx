import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {Ellipsis} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton.tsx'
import type {TableAction} from './tableActions.ts'

/**
 * Props for a table "…" menu: its accessible label and the actions it offers.
 */
interface TableActionMenuProps {
    label: string
    actions: TableAction[]
}

/**
 * The "…" dropdown shown on a table header cell or row: a trigger button opening a menu of table actions. Built on
 * Radix `DropdownMenu` for keyboard navigation, ARIA roles, and zoom-aware (portalled, fixed) positioning.
 */
function TableActionMenu({label, actions}: TableActionMenuProps) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <IconButton icon={<Ellipsis/>} label={label} size="small" appearance="flat" contentEditable={false}/>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content className="menu menu__list" align="end" sideOffset={4}
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

export default TableActionMenu
