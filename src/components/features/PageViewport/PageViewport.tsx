import type {CSSProperties, ReactNode} from 'react'
import {useEffect} from 'react'
import './PageViewport.css'
import ViewControls from './ViewControls.tsx'
import {usePageScale} from '@hooks/usePageScale.ts'
import {usePinchZoomCapable} from '@hooks/usePinchZoomCapable.ts'

/**
 * Props for the page viewport: the active page's natural (unscaled) width the zoom scales to a fraction of the
 * viewport, and the page content to render inside the scaled wrapper.
 */
interface PageViewportProps {
    naturalWidth: number
    children: ReactNode
}

/**
 * The shared zoom scaffold around a page: a wrapper scaled to a persisted fraction of the viewport (via usePageScale)
 * with the bottom-corner zoom controls, so the character-sheet binder and the markdown-template editor share one view.
 */
function PageViewport({naturalWidth, children}: PageViewportProps) {
    const {scale, scaleUp, scaleDown, canScaleUp, canScaleDown, viewReference} = usePageScale(naturalWidth)
    // On a pinch-and-pan device the native gesture replaces these buttons, so they are dropped there.
    const pinchCapable = usePinchZoomCapable()

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

    // The scale is also published as a custom property so in-page controls can counter-scale (`1 / --page-scale`) to a
    // constant on-screen size against the zoom transform.
    // On a pinch-capable device the native gesture does the zooming, so the controls' scale is pinned to 1.
    const effectiveScale = pinchCapable ? 1 : scale
    const viewStyle = {transform: `scale(${effectiveScale})`, '--page-scale': effectiveScale} as CSSProperties

    return (
        <>
            <div className="binder-view" ref={viewReference} style={viewStyle}>
                {children}
            </div>
            {!pinchCapable && (
                <ViewControls onScaleUp={scaleUp} onScaleDown={scaleDown} canScaleUp={canScaleUp}
                              canScaleDown={canScaleDown}/>
            )}
        </>
    )
}

export default PageViewport
