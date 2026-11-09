import type {ReactNode} from 'react'
import {useState} from 'react'
import './SurfaceLayout.css'
import SurfaceScrollContext from './surfaceScrollContext.ts'

/**
 * Props for the surface layout: the controls for the left sidebar and the page content for the scrolling pane.
 */
interface SurfaceLayoutProps {
    sidebar: ReactNode
    children: ReactNode
}

/**
 * A surface shell: a full-height left control sidebar beside a vertically scrolling content pane. The sidebar is
 * in-flow, so it pans and scales with the page under pinch-zoom (never drifting off), while vertical scrolling is
 * confined to the content pane so the sidebar stays put as the page scrolls.
 */
function SurfaceLayout({sidebar, children}: SurfaceLayoutProps) {
    // The pane element is held in state (not a ref) so controls that read it through context re-render once it mounts.
    const [scrollPane, setScrollPane] = useState<HTMLElement | null>(null)
    return (
        <SurfaceScrollContext.Provider value={scrollPane}>
            <div className="surface">
                <aside className="sidebar no-print">{sidebar}</aside>
                <div className="surface__content" ref={setScrollPane}>
                    {children}
                </div>
            </div>
        </SurfaceScrollContext.Provider>
    )
}

export default SurfaceLayout
