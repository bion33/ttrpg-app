import {useEffect, useRef, useState} from 'react'
import './CharacterSheet.css'
import FieldInput from '../../ui/FieldInput/FieldInput'
import {Fields} from './layout/sheet.ts'

const SVG_URL = '/character-sheet/character-sheet.svg'
const VIEW_BOX = '0 0 816 1055.867'

/**
 * Fetches and injects the artwork SVG and renders the overlay fields inside it.
 */
function CharacterSheet() {
    const [artworkMarkup, setArtworkMarkup] = useState<string | null>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    useEffect(() => {
        fetch(SVG_URL)
            .then((res) => res.text())
            .then((text) => {
                const match = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
                setArtworkMarkup(match ? match[1] : text)
            })
    }, [])

    if (!artworkMarkup) return <p>Loading character sheet…</p>

    return (
        <svg
            ref={svgRef}
            className="character-sheet"
            viewBox={VIEW_BOX}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g dangerouslySetInnerHTML={{__html: artworkMarkup}}/>
            {Fields.map((node) => (
                <FieldInput key={node.def.id} node={node}/>
            ))}
        </svg>
    )
}

export default CharacterSheet
