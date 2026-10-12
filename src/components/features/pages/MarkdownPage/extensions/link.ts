import {mergeAttributes} from '@tiptap/core'
import {Link as TiptapLink} from '@tiptap/extension-link'

/**
 * The hyperlink mark, extending Tiptap's link to also render a `title` mirroring the href so hovering a link reveals
 * its destination. Click handling (in-app navigation vs. new browser tab) is wired where the editor is built.
 */
export const Link = TiptapLink.extend({
    renderHTML({HTMLAttributes}) {
        return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {title: HTMLAttributes.href}), 0]
    },
})
