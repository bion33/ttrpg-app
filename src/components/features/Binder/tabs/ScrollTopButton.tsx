import {useEffect, useState} from 'react'
import {ArrowUp} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'
import {useSurfaceScroll} from '@ui/SurfaceLayout/surfaceScrollContext.ts'

/**
 * Props for the back-to-top button: the last tab whose visibility within the content pane gates whether the button
 * shows.
 */
interface ScrollTopButtonProps {
    lastTab: HTMLElement | null
}

/**
 * A back-to-top button for the binder's content pane, shown once the last tab has scrolled out of view and scrolling
 * that pane (not the window) back to the top.
 */
function ScrollTopButton({lastTab}: ScrollTopButtonProps) {
    const scrollPane = useSurfaceScroll()
    const [scrolledPast, setScrolledPast] = useState(false)

    // Watch whether the last tab is still on screen within the content pane so the button can appear when it is not.
    useEffect(() => {
        if (!lastTab) return
        const observer = new IntersectionObserver(([entry]) => setScrolledPast(!entry.isIntersecting), {root: scrollPane})
        observer.observe(lastTab)
        return () => observer.disconnect()
    }, [lastTab, scrollPane])

    if (!lastTab || !scrolledPast) return null
    return (
        <IconButton icon={<ArrowUp/>} label="Back to top"
                    onClick={() => (scrollPane ?? window).scrollTo({top: 0, behavior: 'smooth'})}/>
    )
}

export default ScrollTopButton
