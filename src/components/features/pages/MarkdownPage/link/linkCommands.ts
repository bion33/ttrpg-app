import type {Editor} from '@tiptap/core'
import {getMarkRange} from '@tiptap/core'

/**
 * A hyperlink's two editable parts: the href it points to and the visible text that carries it.
 */
export interface LinkSelection {
    url: string
    label: string
}

/**
 * Reads the href and visible text the link dialogue should open with: the current selection's text, or, with an empty
 * selection, the text of the link the caret sits in.
 */
export function readLinkSelection(editor: Editor): LinkSelection {
    const url = editor.getAttributes('link').href ?? ''
    const {doc, selection} = editor.state
    if (!selection.empty) return {url, label: doc.textBetween(selection.from, selection.to)}
    const range = getMarkRange(selection.$from, editor.schema.marks.link)
    if (range) return {url, label: doc.textBetween(range.from, range.to)}
    return {url, label: ''}
}

/**
 * Applies a hyperlink with the given href and label to the selection (or the link under the caret, or at the caret when
 * neither), replacing the targeted text when the label changed and re-marking it in place when it did not.
 */
export function applyLink(editor: Editor, {url, label}: LinkSelection): void {
    const text = label.trim() || url
    const {doc, selection} = editor.state
    const linkMark = {type: 'link', attrs: {href: url}}
    const range = selection.empty ? getMarkRange(selection.$from, editor.schema.marks.link) : {
        from: selection.from, to: selection.to
    }
    if (!range) {
        editor.chain().focus().insertContent({type: 'text', text, marks: [linkMark]}).run()
        return
    }
    // Unchanged text: re-mark the existing range so inline formatting inside it survives; changed text: replace it.
    if (doc.textBetween(range.from, range.to) === text) {
        editor.chain().focus().setTextSelection(range).setLink({href: url}).run()
        return
    }
    editor.chain().focus().insertContentAt(range, {type: 'text', text, marks: [linkMark]}).run()
}

/**
 * Removes the hyperlink covering the current selection or caret.
 */
export function removeLink(editor: Editor): void {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
}
