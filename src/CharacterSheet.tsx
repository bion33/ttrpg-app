import {useEffect, useRef, useState} from 'react'
import './CharacterSheet.css'
import FieldInput from './components/FieldInput'
import {Fields} from './fields.ts'

const SVG_URL = '/character-sheet/character-sheet.svg'
const VIEW_BOX = '0 0 816 1055.867'
const STORAGE_PREFIX = 'characterSheet'

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
            {Fields.map((field) => (
                <FieldInput key={field.id} field={field} storagePrefix={STORAGE_PREFIX}/>
            ))}
        </svg>
    )
}

export default CharacterSheet
