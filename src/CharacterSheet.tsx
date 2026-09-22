import {useEffect, useRef, useState} from 'react'
import './CharacterSheet.css'
import AutoFitInput from './components/AutoFitInput'
import NumericInput from './components/NumericInput'
import type {FieldDefinition} from './types/FieldDefinition.ts'

const SVG_URL = '/character-sheet/character-sheet.svg'
const VIEW_BOX = '0 0 816 1055.867'

const Fields: FieldDefinition[] = [
    {id: 'characterName', x: 88, y: 82, width: 230, height: 28, type: 'text', fontSize: 24, textAlign: 'center'},

    {id: 'classAndLevel', x: 359.6, y: 64, width: 142, height: 22, type: 'text', fontSize: 18},
    {id: 'background', x: 510, y: 64, width: 122, height: 22, type: 'text', fontSize: 18},
    {id: 'playerName', x: 639, y: 64, width: 155, height: 22, type: 'text', fontSize: 18},
    {id: 'raceAndSize', x: 359.6, y: 98, width: 142, height: 22, type: 'text', fontSize: 18},
    {id: 'alignment', x: 510, y: 98, width: 122, height: 22, type: 'text', fontSize: 18},
    {id: 'experiencePoints', x: 639.1, y: 98, width: 155, height: 22, type: 'text', fontSize: 18},

    {id: 'armorClass', x: 308, y: 206, width: 42, height: 32, type: 'number', fontSize: 28, textAlign: 'center'},
    {id: 'darkvision', x: 374, y: 172, width: 63, height: 16, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'initiative', x: 380, y: 206, width: 50, height: 32, type: 'number', fontSize: 28, textAlign: 'center'},

    {id: 'runSpeed', x: 458, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'climbSpeed', x: 482, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'swimSpeed', x: 458, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'flySpeed', x: 482, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},

    {id: 'maxHitPoints', x: 387, y: 252, width: 36, height: 24, type: 'number', fontSize: 24, textAlign: 'center'},
    {id: 'temporaryHitPoints', x: 434, y: 265, width: 68.79, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'currentHitPoints', x: 350, y: 292, width: 110, height: 36, type: 'number', fontSize: 32, textAlign: 'center'},

    {id: 'hitDiceTotalLeft', x: 578, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'hitDiceTotalRight', x: 602, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'hitDiceUsedLeft', x: 578, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'hitDiceUsedRight', x: 602, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},

]

function CharacterSheet() {
    const [artworkMarkup, setArtworkMarkup] = useState<string | null>(null)
    const [values, setValues] = useState<Record<string, string>>({})
    const svgRef = useRef<SVGSVGElement>(null)

    useEffect(() => {
        fetch(SVG_URL)
            .then((res) => res.text())
            .then((text) => {
                const match = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
                setArtworkMarkup(match ? match[1] : text)
            })
    }, [])

    const setValue = (id: string, value: string) =>
        setValues((prev) => ({...prev, [id]: value}))

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
                <foreignObject
                    key={field.id}
                    x={field.x}
                    y={field.y}
                    width={field.width}
                    height={field.height}
                >
                    {field.type === 'text' ? (
                        <AutoFitInput
                            field={field}
                            value={values[field.id] ?? ''}
                            onChange={(value) => setValue(field.id, value)}
                        />
                    ) : (
                        <NumericInput
                            field={field}
                            value={values[field.id] ?? ''}
                            onChange={(value) => setValue(field.id, value)}
                        />
                    )}
                </foreignObject>
            ))}
        </svg>
    )
}

export default CharacterSheet
