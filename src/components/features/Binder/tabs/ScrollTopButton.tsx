import {useEffect, useState} from 'react'
import {ArrowUp} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'
import {useSurfaceScroll} from '@ui/SurfaceLayout/surfaceScrollContext.ts'

// How far the content pane must be scrolled, as a fraction of its own visible height, before the back-to-top button
// appears — far enough that the top is no longer in view, independent of screen size or page zoom.
const SHOW_AFTER_PANE_FRACTION = 0.5

/**
 * A back-to-top button for the binder's content pane, shown once that pane has scrolled away from the top and scrolling
 * it (not the window) back to the top.
 */
function ScrollTopButton() {
    const scrollPane = useSurfaceScroll()
    const [scrolledDown, setScrolledDown] = useState(false)

    // Track whether the pane has scrolled past the show threshold so the button can appear once the top is out of view.
    useEffect(() => {
        if (!scrollPane) return
        const update = () =>
            setScrolledDown(scrollPane.scrollTop > scrollPane.clientHeight * SHOW_AFTER_PANE_FRACTION)
        update()
        scrollPane.addEventListener('scroll', update, {passive: true})
        return () => scrollPane.removeEventListener('scroll', update)
    }, [scrollPane])

    if (!scrolledDown) return null
    return (
        <IconButton icon={<ArrowUp/>} label="Back to top"
                    onClick={() => scrollPane?.scrollTo({top: 0, behavior: 'smooth'})}/>
    )
}

export default ScrollTopButton
