import {useEffect, useState} from 'react'
import '../sheetFonts.css'
import './TracedSheetPage.css'
import FieldInput from '@ui/FieldInput/FieldInput'
import PaperPage from '@ui/PaperPage/PaperPage'
import LoadingSpinner from '@ui/LoadingSpinner/LoadingSpinner'
import {A4_WIDTH_PX, A4_ASPECT_RATIO} from '@lib/paper/paperSize.ts'
import type {FieldNode} from '@type/FieldNode.ts'

// The natural (unscaled) on-screen width every traced sheet renders at: a physical A4 page, the footprint zoom scales.
export const TRACED_SHEET_NATURAL_WIDTH = A4_WIDTH_PX

/**
 * Props for a traced character-sheet page: its artwork SVG, that artwork's own extent, the overlay fields, and the
 * copy to show if the artwork fails to load.
 */
interface TracedSheetPageProps {
    svgUrl: string
    artworkWidth: number
    artworkHeight: number
    fields: FieldNode[]
    errorHeading: string
    errorBody: string
}

/**
 * Renders a traced character-sheet page: fetches and injects the artwork SVG, pads its viewBox to a true A4 footprint,
 * and overlays the given fields in the artwork's own coordinate space.
 */
function TracedSheetPage({svgUrl, artworkWidth, artworkHeight, fields, errorHeading, errorBody}: TracedSheetPageProps) {
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
                <FieldInput key={node.definition.id} node={node}/>
            ))}
        </svg>
    )
}

export default TracedSheetPage
