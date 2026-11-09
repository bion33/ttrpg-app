import ViewControls from './ViewControls.tsx'
import {usePageZoom} from './pageZoomContext.ts'

/**
 * The surface's zoom buttons for its top bar, wired to the shared page-view zoom. Hidden where the device zooms
 * natively (pinch), so the native gesture owns zoom there.
 */
function ZoomControls() {
    const {scaleUp, scaleDown, canScaleUp, canScaleDown, pinchCapable} = usePageZoom()
    if (pinchCapable) return null
    return (
        <ViewControls onScaleUp={scaleUp} onScaleDown={scaleDown} canScaleUp={canScaleUp} canScaleDown={canScaleDown}/>
    )
}

export default ZoomControls
