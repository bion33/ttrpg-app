import type {ReactNode} from 'react'
import {useEffect} from 'react'
import './PageViewport.css'
import ViewControls from './ViewControls.tsx'
import {usePageScale} from '@hooks/usePageScale.ts'

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

    return (
        <>
            <div className="binder-view" ref={viewReference} style={{transform: `scale(${scale})`}}>
                {children}
            </div>
            <ViewControls onScaleUp={scaleUp} onScaleDown={scaleDown} canScaleUp={canScaleUp}
                          canScaleDown={canScaleDown}/>
        </>
    )
}

export default PageViewport
