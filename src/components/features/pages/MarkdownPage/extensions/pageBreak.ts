import {createAtomBlockMarkdownSpec, mergeAttributes, Node} from '@tiptap/core'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        pageBreak: {
            // Inserts a manual page break at the current selection.
            setPageBreak: () => ReturnType
        }
    }
}

/**
 * A manual page-break node: an atomic block that forces the following content onto a new sheet. It round-trips as a
 * self-closing Pandoc directive (`:::pagebreak`) via Tiptap's atom-block markdown spec, matching the callout node.
 */
export const PageBreak = Node.create({
    name: 'pageBreak',
    group: 'block',
    atom: true,
    selectable: true,

    parseHTML() {
        return [{tag: 'div[data-page-break]'}]
    },

    renderHTML({HTMLAttributes}) {
        return ['div', mergeAttributes(HTMLAttributes, {'data-page-break': '', class: 'md-page-break'})]
    },

    addCommands() {
        return {
            setPageBreak: () => ({commands}) => commands.insertContent({type: this.name}),
        }
    },

    ...createAtomBlockMarkdownSpec({nodeName: 'pageBreak', name: 'pagebreak'}),
})
