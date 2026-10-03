import {createBlockMarkdownSpec, mergeAttributes, Node} from '@tiptap/core'

/**
 * The four callout kinds, matching Nextcloud's info/success/warning/danger notices.
 */
export type CalloutType = 'info' | 'success' | 'warning' | 'danger'

/**
 * The callout kinds in menu order.
 */
export const CALLOUT_TYPES: CalloutType[] = ['info', 'success', 'warning', 'danger']

/**
 * A block callout ("admonition") node holding block content, tinted by its `type`. It round-trips as a Pandoc fenced
 * directive (`:::callout {type=info} … :::`) via Tiptap's block markdown spec.
 */
export const Callout = Node.create({
    name: 'callout',
    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            type: {
                default: 'info',
                parseHTML: (element) => element.getAttribute('data-callout') ?? 'info',
                renderHTML: (attributes) => ({'data-callout': attributes.type}),
            },
        }
    },

    parseHTML() {
        return [{tag: 'div[data-callout]'}]
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(HTMLAttributes, {class: 'callout'}), 0]
    },

    ...createBlockMarkdownSpec({
        nodeName: 'callout',
        defaultAttributes: {type: 'info'},
        allowedAttributes: ['type'],
    }),
})
