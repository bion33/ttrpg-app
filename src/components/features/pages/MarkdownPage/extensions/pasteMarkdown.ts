import {Extension} from '@tiptap/core'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import {markdownPasteText} from '../logic/paste/paste.ts'

const pasteMarkdownKey = new PluginKey('pasteMarkdown')

/**
 * Reparses pasted plain text as markdown, so block-level syntax (headings, lists, tables, dividers) renders on paste
 * instead of landing as literal text that only heals on the next load. Defers to the editor's default paste when the
 * clipboard carries formatted HTML.
 */
export const PasteMarkdown = Extension.create({
    name: 'pasteMarkdown',

    addProseMirrorPlugins() {
        const editor = this.editor
        return [
            new Plugin({
                key: pasteMarkdownKey,
                props: {
                    handlePaste(_view, event) {
                        const clipboard = event.clipboardData
                        if (!clipboard) return false
                        const text = markdownPasteText(Array.from(clipboard.types), clipboard.getData('text/plain'))
                        if (text === null) return false
                        editor.commands.insertContent(text, {contentType: 'markdown'})
                        return true
                    },
                },
            }),
        ]
    },
})
