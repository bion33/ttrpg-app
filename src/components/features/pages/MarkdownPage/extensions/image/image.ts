import {ReactNodeViewRenderer} from '@tiptap/react'
import {Image as BaseImage} from '@tiptap/extension-image'
import ImageNodeView from './ImageNodeView.tsx'

/**
 * The markdown image node with a node view that resolves a local OPFS image path (or a remote URL) to a renderable
 * source. The node's schema and name are unchanged from the base extension, so images still round-trip as plain
 * markdown (`![alt](src)`) with the relative path verbatim.
 */
export const Image = BaseImage.extend({
    addNodeView: () => ReactNodeViewRenderer(ImageNodeView),
})
