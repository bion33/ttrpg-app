import type {ReactNode} from 'react'
import {useRef} from 'react'
import * as Popover from '@radix-ui/react-popover'
import {Command} from 'cmdk'
import type {Editor} from '@tiptap/core'
import type {BlockAction} from './blocks/insertBlocks.ts'

/**
 * Props for the shared block-actions menu: the editor whose state marks active items, the actions it lists, the
 * trigger element that opens it, the controlled open state, and the callback that applies a chosen action.
 */
interface BlockActionsMenuProps {
    editor: Editor
    actions: BlockAction[]
    trigger: ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
    onRunAction: (action: BlockAction) => void
    align?: 'start' | 'center' | 'end'
    searchPlaceholder?: string
    // Whether to mark the action matching the current block type as active (the toolbar does; the insert menu does not).
    markActive?: boolean
}

/**
 * The searchable dropdown shared by the toolbar's block groups and the block handle's "+" menu: a Radix `Popover`
 * (portalled and zoom-safe) wrapping a cmdk `Command` that filters the actions by label and runs the chosen one.
 */
function BlockActionsMenu({
                              editor, actions, trigger, open, onOpenChange, onRunAction, align = 'start',
                              searchPlaceholder = 'Search', markActive = true
                          }: BlockActionsMenuProps) {
    const inputReference = useRef<HTMLInputElement>(null)

    function select(action: BlockAction) {
        onOpenChange(false)
        onRunAction(action)
    }

    return (
        <Popover.Root open={open} onOpenChange={onOpenChange}>
            <Popover.Trigger asChild>{trigger}</Popover.Trigger>
            <Popover.Portal>
                <Popover.Content className="menu block-menu" align={align} sideOffset={4}
                    // Focus the search field on open and keep the caret in the editor on close.
                                 onOpenAutoFocus={(event) => {
                                     event.preventDefault()
                                     inputReference.current?.focus()
                                 }}
                                 onCloseAutoFocus={(event) => event.preventDefault()}>
                    <Command className="block-menu__command">
                        <Command.Input ref={inputReference} className="block-menu__input"
                                       placeholder={searchPlaceholder}/>
                        <Command.List className="menu__list block-menu__list">
                            <Command.Empty className="block-menu__empty">No blocks found</Command.Empty>
                            {actions.map((action) => {
                                const ActionIcon = action.icon
                                return (
                                    <Command.Item key={action.id} value={action.label} onSelect={() => select(action)}
                                                  className={'menu__item' +
                                                      (markActive && action.isActive(editor) ? ' is-active' : '')}>
                                        <ActionIcon size={16}/> {action.label}
                                    </Command.Item>
                                )
                            })}
                        </Command.List>
                    </Command>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}

export default BlockActionsMenu
