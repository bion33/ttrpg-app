import {Minus, Plus} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'

/**
 * Props for the view-control group: scale the page and tabs up or down. `canScaleUp` is false once the page has
 * grown to fill the screen width and `canScaleDown` false at the minimum scale, disabling the button that no longer
 * applies.
 */
interface ViewControlsProps {
    onScaleUp: () => void
    onScaleDown: () => void
    canScaleUp: boolean
    canScaleDown: boolean
}

/**
 * The zoom-in/zoom-out buttons that scale the page and tab strip; the caller places them within a sidebar group.
 */
function ViewControls({onScaleUp, onScaleDown, canScaleUp, canScaleDown}: ViewControlsProps) {
    return (
        <>
            <IconButton icon={<Plus/>} label="Zoom in" labelSide="right" onClick={onScaleUp} disabled={!canScaleUp}/>
            <IconButton icon={<Minus/>} label="Zoom out" labelSide="right" onClick={onScaleDown}
                        disabled={!canScaleDown}/>
        </>
    )
}

export default ViewControls
