import type {Editor} from '@tiptap/core'
import {
    CaseSensitive, CircleCheck, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Image, Info, List,
    ListOrdered, ListTodo, type LucideIcon, OctagonX, Sheet, SquareSplitVertical, TextQuote, TriangleAlert,
} from 'lucide-react'
import {CALLOUT_TYPES, type CalloutType} from '../extensions/callout.ts'

/**
 * One block a user can turn the current line into or insert: its menu label and icon, whether it is currently active,
 * and the command that applies it. Shared by the toolbar and the block handle's "+" menu so the two never drift.
 */
export type BlockGroupId = 'heading' | 'block' | 'list' | 'insert'

export interface BlockAction {
    id: string
    label: string
    icon: LucideIcon
    // Actions of the same group share a toolbar dropdown / a block-handle menu section.
    group: BlockGroupId
    isActive: (editor: Editor) => boolean
    run: (editor: Editor) => void
}

/**
 * A toolbar dropdown: the group's default trigger label/icon (shown when no member action is active) and its actions.
 */
export interface BlockGroup {
    id: BlockGroupId
    label: string
    icon: LucideIcon
    actions: BlockAction[]
}

// The heading icon per level, used for both the menu item and (of the active level) the dropdown trigger.
const HEADING_ICONS: Record<number, LucideIcon> = {1: Heading1, 2: Heading2, 3: Heading3, 4: Heading4, 5: Heading5,
    6: Heading6}

// The icon per callout kind (info/success/warning/danger).
const CALLOUT_ICONS: Record<CalloutType, LucideIcon> = {info: Info, success: CircleCheck, warning: TriangleAlert,
    danger: OctagonX}

// Title-cases a callout type for its menu label (e.g. "info" -> "Info callout").
function calloutLabel(type: CalloutType): string {
    return `${type[0].toUpperCase()}${type.slice(1)} callout`
}

/**
 * The block actions offered in the toolbar and the block-handle insert menu, in menu order.
 */
export const BLOCK_ACTIONS: BlockAction[] = [
    ...([1, 2, 3, 4, 5, 6] as const).map((level): BlockAction => ({
        id: `heading-${level}`, label: `Heading ${level}`, icon: HEADING_ICONS[level], group: 'heading',
        isActive: (editor) => editor.isActive('heading', {level}),
        run: (editor) => editor.chain().focus().toggleHeading({level}).run(),
    })),
    {
        id: 'paragraph', label: 'Text', icon: CaseSensitive, group: 'block',
        // Text is the fallback block, so it highlights only on a plain paragraph — not inside a list item, callout,
        // or other block whose own action already highlights.
        isActive: (editor) => editor.isActive('paragraph') &&
            !BLOCK_ACTIONS.some((action) => action.id !== 'paragraph' && action.isActive(editor)),
        run: (editor) => editor.chain().focus().setParagraph().run(),
    },
    {
        id: 'blockquote', label: 'Quote', icon: TextQuote, group: 'block',
        isActive: (editor) => editor.isActive('blockquote'),
        run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    ...CALLOUT_TYPES.map((type): BlockAction => ({
        id: `callout-${type}`, label: calloutLabel(type), icon: CALLOUT_ICONS[type], group: 'block',
        isActive: (editor) => editor.isActive('callout', {type}),
        run: (editor) => editor.chain().focus().toggleWrap('callout', {type}).run(),
    })),
    {
        id: 'bulletList', label: 'Bullet list', icon: List, group: 'list',
        isActive: (editor) => editor.isActive('bulletList'),
        run: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
        id: 'orderedList', label: 'Numbered list', icon: ListOrdered, group: 'list',
        isActive: (editor) => editor.isActive('orderedList'),
        run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
        id: 'taskList', label: 'Task list', icon: ListTodo, group: 'list',
        isActive: (editor) => editor.isActive('taskList'),
        run: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
        id: 'horizontalRule', label: 'Divider', icon: SquareSplitVertical, group: 'insert',
        isActive: () => false,
        run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
        id: 'table', label: 'Table', icon: Sheet, group: 'insert',
        isActive: (editor) => editor.isActive('table'),
        run: (editor) => editor.chain().focus().insertTable({rows: 3, cols: 3, withHeaderRow: true}).run(),
    },
    {
        id: 'image', label: 'Image', icon: Image, group: 'insert',
        isActive: (editor) => editor.isActive('image'),
        run: (editor) => {
            const url = window.prompt('Image URL')?.trim()
            if (url) editor.chain().focus().setImage({src: url}).run()
        },
    },
]

// The label and default (no-active-member) trigger icon for each dropdown group.
const GROUP_DEFAULTS: Record<'heading' | 'block' | 'list', {label: string; icon: LucideIcon}> = {
    heading: {label: 'Headings', icon: Heading1},
    block: {label: 'Blocks', icon: CaseSensitive},
    list: {label: 'Lists', icon: List},
}

/**
 * The block actions grouped for the toolbar dropdowns, in group order, derived from `BLOCK_ACTIONS`.
 */
export const BLOCK_GROUPS: BlockGroup[] = (['heading', 'block', 'list'] as const).map((id) => ({
    id,
    label: GROUP_DEFAULTS[id].label,
    icon: GROUP_DEFAULTS[id].icon,
    actions: BLOCK_ACTIONS.filter((action) => action.group === id),
}))

/**
 * The standalone insert actions (divider, table, image), shown as their own toolbar buttons rather than a dropdown.
 */
export const INSERT_ACTIONS: BlockAction[] = BLOCK_ACTIONS.filter((action) => action.group === 'insert')
