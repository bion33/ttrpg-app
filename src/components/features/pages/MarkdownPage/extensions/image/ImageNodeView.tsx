import {NodeViewWrapper, type ReactNodeViewProps} from '@tiptap/react'
import {useImageSource} from '@hooks/useImageSource.ts'

/**
 * The node view for a markdown image: resolves the node's `src` — a remote http(s) URL passes through, a local image
 * path loads from the OPFS to a session blob URL — so an uploaded image renders in the editor while the markdown still
 * serialises the relative path verbatim. Shows a placeholder while a local image is loading or missing.
 */
function ImageNodeView({node}: ReactNodeViewProps) {
    const src = typeof node.attrs.src === 'string' ? node.attrs.src : ''
    const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : ''
    const resolved = useImageSource(src)

    return (
        <NodeViewWrapper as="span" className="md-image" data-drag-handle>
            {resolved
                ? <img src={resolved} alt={alt}/>
                : <span className="md-image__placeholder">{alt || 'image'}</span>}
        </NodeViewWrapper>
    )
}

export default ImageNodeView
