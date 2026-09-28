import {Minus, Plus} from 'lucide-react'
import IconButton from '../../ui/IconButton/IconButton'
import './ViewControls.css'

/**
 * Props for the view-control cluster: scale the page and tabs up or down. `canScaleUp` is false once the page has
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
 * A fixed cluster of round icon buttons in the bottom-left corner that scale the page and tab strip up or down.
 */
function ViewControls({onScaleUp, onScaleDown, canScaleUp, canScaleDown}: ViewControlsProps) {
    return (
        <div className="view-controls">
            <IconButton icon={<Plus/>} label="Zoom in" labelSide="right" onClick={onScaleUp} disabled={!canScaleUp}/>
            <IconButton icon={<Minus/>} label="Zoom out" labelSide="right" onClick={onScaleDown}
                        disabled={!canScaleDown}/>
        </div>
    )
}

export default ViewControls
