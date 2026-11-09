import {createContext, useContext} from 'react'
import type {PageScale} from '@hooks/usePageScale.ts'

/**
 * The page-view zoom state shared across a surface, plus whether the device zooms natively (pinch), so the viewport
 * and the top-bar zoom controls read one source.
 */
export interface PageZoom extends PageScale {
    pinchCapable: boolean
}

const PageZoomContext = createContext<PageZoom | null>(null)

export default PageZoomContext

/**
 * Reads the page-view zoom state provided by PageZoomProvider.
 */
export function usePageZoom(): PageZoom {
    const zoom = useContext(PageZoomContext)
    if (!zoom) throw new Error('usePageZoom must be used within a PageZoomProvider')
    return zoom
}
