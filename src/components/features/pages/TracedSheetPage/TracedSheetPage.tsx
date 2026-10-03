import type {ReactNode} from 'react'
import {Fragment, useEffect, useState} from 'react'
import '../sheetFonts.css'
import './TracedSheetPage.css'
import FieldInput from '@ui/FieldInput/FieldInput'
import PaperPage from '@ui/PaperPage/PaperPage'
import LoadingSpinner from '@ui/LoadingSpinner/LoadingSpinner'
import {A4_ASPECT_RATIO, A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import type {FieldNode} from '@type/FieldNode.ts'

// The natural (unscaled) on-screen width every traced sheet renders at: a physical A4 page, the footprint zoom scales.
export const TRACED_SHEET_NATURAL_WIDTH = A4_WIDTH_PX

/**
 * Props for a traced character-sheet page: its artwork SVG, that artwork's own extent, the overlay fields, optional
 * per-field decoration (keyed by field id, painted directly above that field so later fields still paint over it), and
 * the copy to show if the artwork fails to load.
 */
interface TracedSheetPageProps {
    svgUrl: string
    artworkWidth: number
    artworkHeight: number
    fields: FieldNode[]
    fieldOverlays?: Record<string, ReactNode>
    errorHeading: string
    errorBody: string
}

/**
 * Renders a traced character-sheet page: fetches and injects the artwork SVG, pads its viewBox to a true A4 footprint,
 * and overlays the given fields in the artwork's own coordinate space.
 */
function TracedSheetPage({
                             svgUrl,
                             artworkWidth,
                             artworkHeight,
                             fields,
                             fieldOverlays,
                             errorHeading,
                             errorBody
                         }: TracedSheetPageProps) {
    const [artworkMarkup, setArtworkMarkup] = useState<string | null>(null)
    const [loadFailed, setLoadFailed] = useState(false)

    // Pad the viewBox symmetrically top and bottom so the overall sheet is true A4, leaving the artwork centred.
    const sheetHeight = artworkWidth * A4_ASPECT_RATIO
    const verticalPadding = (sheetHeight - artworkHeight) / 2
    const viewBox = `0 ${-verticalPadding} ${artworkWidth} ${sheetHeight}`

    useEffect(() => {
        let cancelled = false
        fetch(svgUrl)
            .then((response) => {
                if (!response.ok) throw new Error(`Sheet artwork request failed (${response.status})`)
                return response.text()
            })
            .then((text) => {
                if (cancelled) return
                const match = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
                setArtworkMarkup(match ? match[1] : text)
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true)
            })
        return () => {
            cancelled = true
        }
    }, [svgUrl])

    if (loadFailed) return (
        <PaperPage width={TRACED_SHEET_NATURAL_WIDTH}>
            <h1>{errorHeading}</h1>
            <p>{errorBody}</p>
        </PaperPage>
    );

    if (!artworkMarkup) return (
        <PaperPage width={TRACED_SHEET_NATURAL_WIDTH}>
            <LoadingSpinner/>
        </PaperPage>
    );

    return (
        <svg
            className="traced-sheet-page"
            viewBox={viewBox}
            style={{width: `${TRACED_SHEET_NATURAL_WIDTH}px`}}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g dangerouslySetInnerHTML={{__html: artworkMarkup}}/>
            {fields.map((node) => (
                <Fragment key={node.definition.id}>
                    <FieldInput node={node}/>
                    {fieldOverlays?.[node.definition.id] && (
                        // Wrap the overlay in its own foreignObject so it shares the fields' compositing layer: Chromium
                        // paints every foreignObject above native SVG when printing, so a bare overlay would sink beneath
                        // the field foreignObjects. The nested svg re-enters the artwork's coordinate space.
                        <foreignObject x={0} y={-verticalPadding} width={artworkWidth} height={sheetHeight}
                                       pointerEvents="none">
                            <svg viewBox={viewBox} width="100%" height="100%" style={{overflow: 'visible'}}
                                 xmlns="http://www.w3.org/2000/svg">
                                {fieldOverlays[node.definition.id]}
                            </svg>
                        </foreignObject>
                    )}
                </Fragment>
            ))}
        </svg>
    )
}

export default TracedSheetPage
