import {useEffect, useRef, useState} from 'react'
import './CharacterSheet.css'
import FieldInput from './components/FieldInput'
import type {FieldDefinition} from './types/FieldDefinition.ts'

const SVG_URL = '/character-sheet/character-sheet.svg'
const VIEW_BOX = '0 0 816 1055.867'
const STORAGE_PREFIX = 'characterSheet'

const Fields: FieldDefinition[] = [
    {id: 'characterName', x: 88, y: 82, width: 230, height: 28, type: 'text', fontSize: 24, textAlign: 'center'},

    {id: 'class', x: 360, y: 64, width: 118, height: 22, type: 'text', fontSize: 18},
    {id: 'level', x: 482, y: 64, width: 24, height: 22, type: 'text', fontSize: 18, textAlign: 'center'},
    {id: 'background', x: 510, y: 64, width: 122, height: 22, type: 'text', fontSize: 18},
    {id: 'playerName', x: 639, y: 64, width: 116, height: 22, type: 'text', fontSize: 18},
    {id: 'race', x: 360, y: 98, width: 118, height: 22, type: 'text', fontSize: 18},
    {id: 'size', x: 482, y: 98, width: 24, height: 22, type: 'text', fontSize: 18, textAlign: 'center'},
    {id: 'alignment', x: 510, y: 98, width: 122, height: 22, type: 'text', fontSize: 18},
    {id: 'experiencePoints', x: 639.1, y: 98, width: 116, height: 22, type: 'text', fontSize: 18},

    {id: 'inspiration', x: 151, y: 172, width: 11, height: 11, type: 'checkbox'},

    {id: 'armorClass', x: 308, y: 206, width: 42, height: 32, type: 'number', fontSize: 28, textAlign: 'center'},
    {id: 'darkvision', x: 392, y: 172, width: 26, height: 16, type: 'number', fontSize: 14, textAlign: 'center'},
    {id: 'initiative', x: 380, y: 206, width: 50, height: 32, type: 'number', fontSize: 28, textAlign: 'center'},

    {id: 'runSpeed', x: 458, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'climbSpeed', x: 482, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'swimSpeed', x: 458, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'flySpeed', x: 482, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},

    {id: 'maxHitPoints', x: 387, y: 252, width: 36, height: 24, type: 'number', fontSize: 24, textAlign: 'center'},
    {id: 'temporaryHitPoints', x: 434, y: 265, width: 68.79, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'currentHitPoints', x: 350, y: 292, width: 110, height: 36, type: 'number', fontSize: 32, textAlign: 'center'},

    {id: 'hitDiceClass1', x: 562, y: 210, width: 14, height: 20, type: 'number', fontSize: 12, textAlign: 'center'},
    {id: 'hitDiceTotalClass1', x: 578, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'hitDiceUsedClass1', x: 578, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'hitDiceClass2', x: 635, y: 210, width: 14, height: 20, type: 'number', fontSize: 12, textAlign: 'center'},
    {id: 'hitDiceTotalClass2', x: 602, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'hitDiceUsedClass2', x: 602, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},

    {id: 'deathSaveFailure1', x: 678.27, y: 193.47, width: 11, height: 11, type: 'checkbox'},
    {id: 'deathSaveFailure2', x: 670.8, y: 211.2, width: 11, height: 11, type: 'checkbox'},
    {id: 'deathSaveFailure3', x: 678.27, y: 228.8, width: 11, height: 11, type: 'checkbox'},
    {id: 'deathSaveSuccess1', x: 743.33, y: 193.47, width: 11, height: 11, type: 'checkbox'},
    {id: 'deathSaveSuccess2', x: 750.93, y: 211.2, width: 11, height: 11, type: 'checkbox'},
    {id: 'deathSaveSuccess3', x: 743.33, y: 228.8, width: 11, height: 11, type: 'checkbox'},

    {id: 'athleticsProficiency', x: 137, y: 258, width: 8, height: 8, type: 'checkbox'},
    {id: 'acrobaticsProficiency', x: 137, y: 351, width: 8, height: 8, type: 'checkbox'},
    {id: 'sleightOfHandProficiency', x: 137, y: 367.5, width: 8, height: 8, type: 'checkbox'},
    {id: 'stealthProficiency', x: 137, y: 383.9, width: 8, height: 8, type: 'checkbox'},
    {id: 'arcanaProficiency', x: 137, y: 546, width: 8, height: 8, type: 'checkbox'},
    {id: 'historyProficiency', x: 137, y: 561.7, width: 8, height: 8, type: 'checkbox'},
    {id: 'investigationProficiency', x: 137, y: 577.5, width: 8, height: 8, type: 'checkbox'},
    {id: 'natureProficiency', x: 137, y: 593.1, width: 8, height: 8, type: 'checkbox'},
    {id: 'religionProficiency', x: 137, y: 608.8, width: 8, height: 8, type: 'checkbox'},
    {id: 'animalHandlingProficiency', x: 137, y: 665.3, width: 8, height: 8, type: 'checkbox'},
    {id: 'insightProficiency', x: 137, y: 680.8, width: 8, height: 8, type: 'checkbox'},
    {id: 'medicineProficiency', x: 137, y: 696, width: 8, height: 8, type: 'checkbox'},
    {id: 'perceptionProficiency', x: 137, y: 711.6, width: 8, height: 8, type: 'checkbox'},
    {id: 'survivalProficiency', x: 137, y: 726.5, width: 8, height: 8, type: 'checkbox'},
    {id: 'deceptionProficiency', x: 137, y: 787.8, width: 8, height: 8, type: 'checkbox'},
    {id: 'intimidationProficiency', x: 137, y: 803, width: 8, height: 8, type: 'checkbox'},
    {id: 'performanceProficiency', x: 137, y: 818.8, width: 8, height: 8, type: 'checkbox'},
    {id: 'persuasionProficiency', x: 137, y: 834.3, width: 8, height: 8, type: 'checkbox'},

]

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
