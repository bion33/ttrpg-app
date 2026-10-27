import {mergeAttributes} from '@tiptap/core'
import {Link as TiptapLink} from '@tiptap/extension-link'

/**
 * The hyperlink mark, extending Tiptap's link to render a `title` mirroring the href (so hovering reveals the
 * destination) and `contenteditable="false"` (so a tap follows the link instead of placing the caret in it, which on
 * touch devices would focus the editor and scroll back to the caret). Click handling (in-app navigation vs. new browser
 * tab) is wired where the editor is built.
 */
export const Link = TiptapLink.extend({
    renderHTML({HTMLAttributes}) {
        const attributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
            title: HTMLAttributes.href,
            contenteditable: 'false',
        })
        return ['a', attributes, 0]
    },
})
