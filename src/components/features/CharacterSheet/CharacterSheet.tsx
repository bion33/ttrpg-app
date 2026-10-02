import {useEffect, useMemo, useRef, useState} from 'react'
import './CharacterSheet.css'
import FieldInput from '@ui/FieldInput/FieldInput'
import PaperPage from '@ui/PaperPage/PaperPage'
import LoadingSpinner from '@ui/LoadingSpinner/LoadingSpinner'
import {A4_WIDTH_PX, A4_ASPECT_RATIO} from '@lib/paper/paperSize.ts'
import {buildSheet} from './layout/sheet.ts'

const SVG_URL = '/character-sheet/character-sheet.svg'

// The traced artwork's own extent in viewBox units; its ratio is slightly shorter than A4.
const ARTWORK_WIDTH = 816
const ARTWORK_HEIGHT = 1055.867

// Pad the viewBox symmetrically top and bottom so the overall sheet is true A4, leaving the artwork centred.
const SHEET_HEIGHT = ARTWORK_WIDTH * A4_ASPECT_RATIO
const VERTICAL_PADDING = (SHEET_HEIGHT - ARTWORK_HEIGHT) / 2
const VIEW_BOX = `0 ${-VERTICAL_PADDING} ${ARTWORK_WIDTH} ${SHEET_HEIGHT}`

// The sheet's natural (unscaled) on-screen width: a physical A4 page, the footprint the binder's zoom scales.
const naturalWidth = A4_WIDTH_PX

/**
 * Props for a character sheet: the localStorage-key prefix its fields persist under (one namespace per sheet page).
 */
interface CharacterSheetProps {
    storagePrefix: string
}

/**
 * Fetches and injects the artwork SVG and renders the overlay fields, built under this sheet's own storage prefix.
 */
function CharacterSheet({storagePrefix}: CharacterSheetProps) {
    const [artworkMarkup, setArtworkMarkup] = useState<string | null>(null)
    const [loadFailed, setLoadFailed] = useState(false)
    const svgReference = useRef<SVGSVGElement>(null)
    const {fields} = useMemo(() => buildSheet(storagePrefix), [storagePrefix])

    useEffect(() => {
        let cancelled = false
        fetch(SVG_URL)
            .then((response) => {
                if (!response.ok) throw new Error(`Character sheet artwork request failed (${response.status})`)
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
    }, [])

    if (loadFailed) return (
        <PaperPage width={naturalWidth}>
            <h1>Couldn’t load the character sheet.</h1>
            <p>The character-sheet artwork failed to load. Check your connection and reload the page.</p>
        </PaperPage>
    );

    if (!artworkMarkup) return (
        <PaperPage width={naturalWidth}>
            <LoadingSpinner/>
        </PaperPage>
    );

    return (
        <svg
            ref={svgReference}
            className="character-sheet"
            viewBox={VIEW_BOX}
            style={{width: `${naturalWidth}px`}}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g dangerouslySetInnerHTML={{__html: artworkMarkup}}/>
            {fields.map((node) => (
                <FieldInput key={node.definition.id} node={node}/>
            ))}
        </svg>
    )
}

// Exposed so the binder's zoom can scale the sheet to a fraction of the viewport (a future A5 variant sets its own).
CharacterSheet.naturalWidth = naturalWidth

export default CharacterSheet
