import {Hourglass} from 'lucide-react'
import './LoadingSpinner.css'

/**
 * Props for the loading indicator: an optional CSS length overriding the icon's default size for smaller surfaces.
 */
interface LoadingSpinnerProps {
    size?: string
}

/**
 * A centred loading indicator: an hourglass that flips a half-turn once per second, filling and centring itself within
 * its parent (e.g. a PaperPage loading sheet or an image surface).
 */
function LoadingSpinner({size}: LoadingSpinnerProps) {
    return (
        <div className="loading-spinner">
            <Hourglass className="loading-spinner__icon" aria-hidden="true"
                       style={size ? {width: size, height: size} : undefined}/>
        </div>
    )
}

export default LoadingSpinner
