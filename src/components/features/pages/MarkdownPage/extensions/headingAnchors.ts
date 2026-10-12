import {Extension} from '@tiptap/core'
import type {Node as ProseMirrorNode} from '@tiptap/pm/model'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import {Decoration, DecorationSet} from '@tiptap/pm/view'
import {headingSlugs} from '../logic/headings/headings.ts'

const headingAnchorsKey = new PluginKey('headingAnchors')

// Builds a node decoration per heading that sets its DOM `id` to the heading's slug, so an in-app link can scroll to it
// (natively or via getElementById) without the id entering the serialized markdown.
function buildHeadingDecorations(doc: ProseMirrorNode): DecorationSet {
    const ranges: {from: number; to: number}[] = []
    const texts: string[] = []
    doc.descendants((node, pos) => {
        if (node.type.name !== 'heading') return true
        ranges.push({from: pos, to: pos + node.nodeSize})
        texts.push(node.textContent)
        return false
    })
    const slugs = headingSlugs(texts)
    return DecorationSet.create(doc, ranges.map((range, index) => Decoration.node(range.from, range.to, {id: slugs[index]})))
}

/**
 * Gives every heading a GitHub-style slug `id` on its rendered element (via a node decoration, so it is never
 * serialized into the markdown), the anchor an in-app link scrolls to.
 */
export const HeadingAnchors = Extension.create({
    name: 'headingAnchors',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: headingAnchorsKey,
                props: {
                    decorations(state) {
                        return buildHeadingDecorations(state.doc)
                    },
                },
            }),
        ]
    },
})
