import {NodeViewWrapper, type ReactNodeViewProps} from '@tiptap/react'
import LoadingSpinner from '@ui/LoadingSpinner/LoadingSpinner'
import {useImageSource} from '@hooks/useImageSource.ts'

/**
 * The node view for a markdown image: resolves the node's `src` — a remote http(s) URL passes through, a local image
 * path loads from the OPFS to a session blob URL — so an uploaded image renders in the editor while the markdown still
 * serialises the relative path verbatim. Shows a loader while a local image resolves, then a placeholder if it is
 * missing.
 */
function ImageNodeView({node}: ReactNodeViewProps) {
    const value = typeof node.attrs.src === 'string' ? node.attrs.src : ''
    const alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : ''
    const {src, loading} = useImageSource(value)

    return (
        <NodeViewWrapper as="span" className="md-image" data-drag-handle>
            {src
                ? <img src={src} alt={alt}/>
                : loading
                    ? <LoadingSpinner size="1.5rem"/>
                    : <span className="md-image__placeholder">{alt || 'image'}</span>}
        </NodeViewWrapper>
    )
}

export default ImageNodeView
