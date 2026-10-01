import {Hourglass} from 'lucide-react'
import './LoadingSpinner.css'

/**
 * A centred loading indicator: an hourglass that flips a half-turn once per second, filling and centring itself within
 * its parent (e.g. a PaperPage loading sheet).
 */
function LoadingSpinner() {
    return (
        <div className="loading-spinner">
            <Hourglass className="loading-spinner__icon" aria-hidden="true"/>
        </div>
    )
}

export default LoadingSpinner
