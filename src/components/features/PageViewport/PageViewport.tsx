import type {CSSProperties, ReactNode} from 'react'
import {useEffect} from 'react'
import './PageViewport.css'
import {usePageZoom} from './pageZoomContext.ts'

/**
 * Props for the page viewport: the page content to render inside the scaled wrapper. The zoom state comes from the
 * surrounding PageZoomProvider.
 */
interface PageViewportProps {
    children: ReactNode
}

/**
 * The shared zoom scaffold around a page: a wrapper scaled to the surface's page-view zoom (from PageZoomProvider), so
 * the character-sheet binder and the markdown-template editor share one view. The zoom controls live in the surface's
 * top bar (see ZoomControls), not here.
 */
function PageViewport({children}: PageViewportProps) {
    const {scale, fitScale, contentWidth, contentHeight, viewReference, pinchCapable} = usePageZoom()

    // Promote the view to its own compositor layer only for the duration of a zoom (a little past the 0.25s transition),
    // then drop it — a permanent layer around the editable markdown surface blanks out after inactivity. Toggled as a
    // class on the DOM node, since it is a transient compositor hint, not render-driving data.
    useEffect(() => {
        const view = viewReference.current
        if (!view) return
        view.classList.add('binder-view--zooming')
        const timer = window.setTimeout(() => view.classList.remove('binder-view--zooming'), 300)
        return () => window.clearTimeout(timer)
    }, [scale, viewReference])

    // On a pinch-capable device the page opens fitted to the viewport width and the native gesture owns zoom from there;
    // elsewhere it follows the persisted step zoom.
    const effectiveScale = pinchCapable ? fitScale : scale
    // The scale is also published as a custom property so in-page controls can counter-scale (`1 / --page-scale`) to a
    // constant on-screen size against the zoom transform.
    const viewStyle = {
        transform: `scale(${effectiveScale})`,
        // On the fitted path the frame reserves the scaled box, so scaling from the top-left corner makes the paint fill
        // it exactly; otherwise scale from the top centre so step zoom stays centred.
        transformOrigin: pinchCapable ? 'top left' : undefined,
        '--page-scale': effectiveScale,
    } as CSSProperties
    // On the fitted path the frame collapses the layout box to the scaled footprint so a page wider than the screen no
    // longer overflows; elsewhere it is transparent (`display: contents`) and the view lays out exactly as before.
    const frameStyle = pinchCapable
        ? ({width: contentWidth * effectiveScale, height: contentHeight * effectiveScale} as CSSProperties)
        : undefined

    return (
        <div className={`binder-view-frame${pinchCapable ? ' binder-view-frame--fitted' : ''}`} style={frameStyle}>
            <div className="binder-view" ref={viewReference} style={viewStyle}>
                {children}
            </div>
        </div>
    )
}

export default PageViewport
