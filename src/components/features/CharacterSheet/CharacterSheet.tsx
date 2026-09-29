import {useEffect, useMemo, useRef, useState} from 'react'
import './CharacterSheet.css'
import FieldInput from '../../ui/FieldInput/FieldInput'
import PaperPage from '../../ui/PaperPage/PaperPage'
import {buildSheet} from './layout/sheet.ts'

const SVG_URL = '/character-sheet/character-sheet.svg'
const VIEW_BOX = '0 0 816 1055.867'

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
    const svgReference = useRef<SVGSVGElement>(null)
    const {fields} = useMemo(() => buildSheet(storagePrefix), [storagePrefix])

    useEffect(() => {
        fetch(SVG_URL)
            .then((response) => response.text())
            .then((text) => {
                const match = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
                setArtworkMarkup(match ? match[1] : text)
            })
    }, [])

    if (!artworkMarkup) return (
        <PaperPage>
            <h1>Loading character sheet…</h1>
        </PaperPage>
    );

    return (
        <svg
            ref={svgReference}
            className="character-sheet"
            viewBox={VIEW_BOX}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g dangerouslySetInnerHTML={{__html: artworkMarkup}}/>
            {fields.map((node) => (
                <FieldInput key={node.definition.id} node={node}/>
            ))}
        </svg>
    )
}

export default CharacterSheet
