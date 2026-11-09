import type {ReactNode} from 'react'
import {usePageScale} from '@hooks/usePageScale.ts'
import {usePinchZoomCapable} from '@hooks/usePinchZoomCapable.ts'
import PageZoomContext from './pageZoomContext.ts'

/**
 * Props for the page-zoom provider: the active page's natural (unscaled) width the zoom scales a fraction of, and the
 * surface (its control bar and viewport) that shares the zoom state.
 */
interface PageZoomProviderProps {
    naturalWidth: number
    children: ReactNode
}

/**
 * Owns a surface's page-view zoom state and shares it, so the top-bar zoom controls and the viewport that renders the
 * scaled page read one source. Wrap both in it.
 */
function PageZoomProvider({naturalWidth, children}: PageZoomProviderProps) {
    const pageScale = usePageScale(naturalWidth)
    const pinchCapable = usePinchZoomCapable()
    return <PageZoomContext.Provider value={{...pageScale, pinchCapable}}>{children}</PageZoomContext.Provider>
}

export default PageZoomProvider
