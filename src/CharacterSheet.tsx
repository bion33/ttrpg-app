import {useEffect, useRef, useState} from 'react'
import './CharacterSheet.css'
import FieldInput from './components/FieldInput'
import type {FieldDefinition} from './types/FieldDefinition.ts'

const SVG_URL = '/character-sheet/character-sheet.svg'
const VIEW_BOX = '0 0 816 1055.867'
const STORAGE_PREFIX = 'characterSheet'

const Fields: FieldDefinition[] = [
    // === HEADER === //
    {id: 'characterName', x: 88, y: 82, width: 230, height: 28, type: 'text', fontSize: 24, textAlign: 'center'},

    {id: 'class', x: 360, y: 64, width: 118, height: 22, type: 'text', fontSize: 18},
    {id: 'level', x: 482, y: 64, width: 24, height: 22, type: 'text', fontSize: 18, textAlign: 'center'},
    {id: 'background', x: 510, y: 64, width: 122, height: 22, type: 'text', fontSize: 18},
    {id: 'playerName', x: 639, y: 64, width: 116, height: 22, type: 'text', fontSize: 18},

    {id: 'race', x: 360, y: 98, width: 118, height: 22, type: 'text', fontSize: 18},
    {id: 'size', x: 482, y: 98, width: 24, height: 22, type: 'text', fontSize: 18, textAlign: 'center'},
    {id: 'alignment', x: 510, y: 98, width: 122, height: 22, type: 'text', fontSize: 18},
    {id: 'experiencePoints', x: 639.1, y: 98, width: 116, height: 22, type: 'text', fontSize: 18},

    // === ABILITIES === //

    {id: 'proficiencyBonus', x: 44, y: 166.27, width: 40, height: 32, type: 'number', fontSize: 28, textAlign: 'center'},
    {id: 'inspiration', x: 151, y: 172, width: 11, height: 11, type: 'checkbox'},
    {id: 'enablePassivePerceptionCalc', x: 152.98, y: 208.17, width: 7.25, height: 9, type: 'checkbox', shape: 'star'},
    {id: 'passivePerception', x: 229.33, y: 166.27, width: 40, height: 32, type: 'number', fontSize: 28, textAlign: 'center'},

    // Strength

    {id: 'strengthScore', x: 51.03, y: 242.22, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'strengthExtra', x: 51.03, y: 277.02, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'strengthModifier', x: 70.71, y: 246.34, width: 50.73, height: 39.86, type: 'number', fontSize: 36, textAlign: 'center'},

    {id: 'strengthSavingThrow', x: 136.5, y: 240.5, width: 9, height: 9, type: 'checkbox', shape: 'diamond'},
    {id: 'athleticsExpertise', x: 134.3, y: 255.7, width: 4, height: 4, type: 'checkbox'},
    {id: 'athleticsProficiency', x: 137, y: 258, width: 8, height: 8, type: 'checkbox'},

    // Dexterity

    {id: 'dexterityScore', x: 51.03, y: 337.64, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'dexterityExtra', x: 51.03, y: 372.44, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'dexterityModifier', x: 70.71, y: 341.76, width: 50.73, height: 39.86, type: 'number', fontSize: 36, textAlign: 'center'},

    {id: 'dexteritySavingThrow', x: 136.5, y: 335.7, width: 9, height: 9, type: 'checkbox', shape: 'diamond'},
    {id: 'acrobaticsExpertise', x: 134.3, y: 349.2, width: 4, height: 4, type: 'checkbox'},
    {id: 'acrobaticsProficiency', x: 137, y: 351.1, width: 8, height: 8, type: 'checkbox'},
    {id: 'sleightOfHandExpertise', x: 134.3, y: 365.2, width: 4, height: 4, type: 'checkbox'},
    {id: 'sleightOfHandProficiency', x: 137, y: 367.4, width: 8, height: 8, type: 'checkbox'},
    {id: 'stealthExpertise', x: 134, y: 382.3, width: 4, height: 4, type: 'checkbox'},
    {id: 'stealthProficiency', x: 137, y: 383.9, width: 8, height: 8, type: 'checkbox'},

    // Constitution

    {id: 'constitutionScore', x: 51.03, y: 433.69, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'constitutionExtra', x: 51.03, y: 468.57, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'constitutionModifier', x: 70.71, y: 437.89, width: 50.73, height: 39.86, type: 'number', fontSize: 36, textAlign: 'center'},

    {id: 'constitutionSavingThrow', x: 136.5, y: 431.1, width: 9, height: 9, type: 'checkbox', shape: 'diamond'},

    // Intelligence

    {id: 'intelligenceScore', x: 51.03, y: 533.37, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'intelligenceExtra', x: 51.03, y: 568.17, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'intelligenceModifier', x: 70.71, y: 537.49, width: 50.73, height: 39.86, type: 'number', fontSize: 36, textAlign: 'center'},

    {id: 'intelligenceSavingThrow', x: 136.5, y: 530.7, width: 9, height: 9, type: 'checkbox', shape: 'diamond'},
    {id: 'arcanaExpertise', x: 134.3, y: 543.9, width: 4, height: 4, type: 'checkbox'},
    {id: 'arcanaProficiency', x: 137, y: 546, width: 8, height: 8, type: 'checkbox'},
    {id: 'historyExpertise', x: 134.3, y: 559.3, width: 4, height: 4, type: 'checkbox'},
    {id: 'historyProficiency', x: 137, y: 561.6, width: 8, height: 8, type: 'checkbox'},
    {id: 'investigationExpertise', x: 134.3, y: 575.3, width: 4, height: 4, type: 'checkbox'},
    {id: 'investigationProficiency', x: 137, y: 577.5, width: 8, height: 8, type: 'checkbox'},
    {id: 'natureExpertise', x: 134.3, y: 590.8, width: 4, height: 4, type: 'checkbox'},
    {id: 'natureProficiency', x: 137, y: 593.1, width: 8, height: 8, type: 'checkbox'},
    {id: 'religionExpertise', x: 134.3, y: 606.3, width: 4, height: 4, type: 'checkbox'},
    {id: 'religionProficiency', x: 137, y: 608.5, width: 8, height: 8, type: 'checkbox'},

    // Wisdom

    {id: 'wisdomScore', x: 51.03, y: 651.37, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'wisdomExtra', x: 51.03, y: 686.17, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'wisdomModifier', x: 70.71, y: 655.49, width: 50.73, height: 39.86, type: 'number', fontSize: 36, textAlign: 'center'},

    {id: 'wisdomSavingThrow', x: 136.5, y: 648.8, width: 9, height: 9, type: 'checkbox', shape: 'diamond'},
    {id: 'animalHandlingExpertise', x: 134.3, y: 663.3, width: 4, height: 4, type: 'checkbox'},
    {id: 'animalHandlingProficiency', x: 137, y: 665.4, width: 8, height: 8, type: 'checkbox'},
    {id: 'insightExpertise', x: 134.3, y: 678.7, width: 4, height: 4, type: 'checkbox'},
    {id: 'insightProficiency', x: 137, y: 680.9, width: 8, height: 8, type: 'checkbox'},
    {id: 'medicineExpertise', x: 134.3, y: 693.6, width: 4, height: 4, type: 'checkbox'},
    {id: 'medicineProficiency', x: 137, y: 695.9, width: 8, height: 8, type: 'checkbox'},
    {id: 'perceptionExpertise', x: 134.3, y: 709.5, width: 4, height: 4, type: 'checkbox'},
    {id: 'perceptionProficiency', x: 137, y: 711.7, width: 8, height: 8, type: 'checkbox'},
    {id: 'survivalExpertise', x: 134.3, y: 724.4, width: 4, height: 4, type: 'checkbox'},
    {id: 'survivalProficiency', x: 137, y: 726.5, width: 8, height: 8, type: 'checkbox'},

    // Charisma

    {id: 'charismaScore', x: 51.03, y: 773.82, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'charismaExtra', x: 51.03, y: 808.62, width: 20.49, height: 16.1, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'charismaModifier', x: 70.71, y: 777.94, width: 50.73, height: 39.86, type: 'number', fontSize: 36, textAlign: 'center'},

    {id: 'charismaSavingThrow', x: 136.5, y: 771.3, width: 9, height: 9, type: 'checkbox', shape: 'diamond'},
    {id: 'deceptionExpertise', x: 134.3, y: 785.6, width: 4, height: 4, type: 'checkbox'},
    {id: 'deceptionProficiency', x: 137, y: 787.8, width: 8, height: 8, type: 'checkbox'},
    {id: 'intimidationExpertise', x: 134.3, y: 800.9, width: 4, height: 4, type: 'checkbox'},
    {id: 'intimidationProficiency', x: 137, y: 803, width: 8, height: 8, type: 'checkbox'},
    {id: 'performanceExpertise', x: 134.3, y: 816.8, width: 4, height: 4, type: 'checkbox'},
    {id: 'performanceProficiency', x: 137, y: 818.8, width: 8, height: 8, type: 'checkbox'},
    {id: 'persuasionExpertise', x: 134.3, y: 832.3, width: 4, height: 4, type: 'checkbox'},
    {id: 'persuasionProficiency', x: 137, y: 834.3, width: 8, height: 8, type: 'checkbox'},

    // === COMBAT STATS  === //

    {id: 'armorClass', x: 308, y: 206, width: 42, height: 32, type: 'number', fontSize: 28, textAlign: 'center'},
    {id: 'darkvision', x: 392, y: 172, width: 26, height: 16, type: 'number', fontSize: 14, textAlign: 'center'},
    {id: 'initiative', x: 380, y: 206, width: 50, height: 32, type: 'number', fontSize: 28, textAlign: 'center'},

    // Speed

    {id: 'enableSpeedCalc', x: 480.01, y: 180.05, width: 7.25, height: 9, type: 'checkbox', shape: 'star'},
    {id: 'runSpeed', x: 458, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'climbSpeed', x: 482, y: 202, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'swimSpeed', x: 458, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'flySpeed', x: 482, y: 222, width: 26, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},

    // HP

    {id: 'maxHitPoints', x: 387, y: 252, width: 36, height: 24, type: 'number', fontSize: 24, textAlign: 'center'},
    {id: 'temporaryHitPoints', x: 434, y: 265, width: 68.79, height: 18, type: 'number', fontSize: 16, textAlign: 'center'},
    {id: 'currentHitPoints', x: 350, y: 292, width: 110, height: 36, type: 'number', fontSize: 32, textAlign: 'center'},

    {id: 'buffsDebuffsConditions', x: 305, y: 350, width: 210, height: 56, type: 'textarea', fontSize: 12},

    // === WEAPONS, CANTRIPS & SPELLS === //

    // ...

    // === NOTES === //

    {id: 'notes', x: 44, y: 878, width: 476, height: 154, type: 'textarea', fontSize: 12},

    // === HIT DICE & DEATH SAVES  === //

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

    // === DAMAGE TYPES === //

    {id: 'bludgeoningImmunity', x: 560.67, y: 271.73, width: 5.87, height: 6, type: 'checkbox', color: 'green'},
    {id: 'bludgeoningResistance', x: 567.33, y: 271.73, width: 5.87, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'bludgeoningVulnerability', x: 573.87, y: 271.73, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'piercingImmunity', x: 560.67, y: 284.4, width: 5.87, height: 6, type: 'checkbox', color: 'green'},
    {id: 'piercingResistance', x: 567.33, y: 284.4, width: 5.87, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'piercingVulnerability', x: 573.87, y: 284.4, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'slashingImmunity', x: 560.67, y: 297.07, width: 5.87, height: 6, type: 'checkbox', color: 'green'},
    {id: 'slashingResistance', x: 567.33, y: 297.07, width: 5.87, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'slashingVulnerability', x: 573.87, y: 297.07, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'coldImmunity', x: 560.67, y: 309.73, width: 5.87, height: 6, type: 'checkbox', color: 'green'},
    {id: 'coldResistance', x: 567.33, y: 309.73, width: 5.87, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'coldVulnerability', x: 573.87, y: 309.73, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'fireImmunity', x: 560.93, y: 322.4, width: 5.87, height: 6, type: 'checkbox', color: 'green'},
    {id: 'fireResistance', x: 567.6, y: 322.4, width: 5.87, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'fireVulnerability', x: 574.13, y: 322.4, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'poisonImmunity', x: 628.53, y: 271.73, width: 6, height: 6, type: 'checkbox', color: 'green'},
    {id: 'poisonResistance', x: 635.2, y: 271.73, width: 6, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'poisonVulnerability', x: 641.87, y: 271.73, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'acidImmunity', x: 628.53, y: 284.4, width: 6, height: 6, type: 'checkbox', color: 'green'},
    {id: 'acidResistance', x: 635.2, y: 284.4, width: 6, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'acidVulnerability', x: 641.87, y: 284.4, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'psychicImmunity', x: 628.53, y: 297.07, width: 6, height: 6, type: 'checkbox', color: 'green'},
    {id: 'psychicResistance', x: 635.2, y: 297.07, width: 6, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'psychicVulnerability', x: 641.87, y: 297.07, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'necroticImmunity', x: 628.53, y: 309.73, width: 6, height: 6, type: 'checkbox', color: 'green'},
    {id: 'necroticResistance', x: 635.2, y: 309.73, width: 6, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'necroticVulnerability', x: 641.87, y: 309.73, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'radiantImmunity', x: 697.87, y: 271.73, width: 6, height: 6, type: 'checkbox', color: 'green'},
    {id: 'radiantResistance', x: 704.53, y: 271.73, width: 6, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'radiantVulnerability', x: 711.2, y: 271.73, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'lightningImmunity', x: 697.87, y: 284.4, width: 6, height: 6, type: 'checkbox', color: 'green'},
    {id: 'lightningResistance', x: 704.53, y: 284.4, width: 6, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'lightningVulnerability', x: 711.2, y: 284.4, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'thunderImmunity', x: 697.87, y: 297.07, width: 6, height: 6, type: 'checkbox', color: 'green'},
    {id: 'thunderResistance', x: 704.53, y: 297.07, width: 6, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'thunderVulnerability', x: 711.2, y: 297.07, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    {id: 'forceImmunity', x: 697.87, y: 309.73, width: 6, height: 6, type: 'checkbox', color: 'green'},
    {id: 'forceResistance', x: 704.53, y: 309.73, width: 6, height: 6, type: 'checkbox', color: 'goldenrod'},
    {id: 'forceVulnerability', x: 711.2, y: 309.73, width: 6, height: 6, type: 'checkbox', color: 'firebrick'},

    // === OTHER PROFICIENCIES, FEATURES & TRAITS === //

    {id: 'languages', x: 548, y: 364, width: 224, height: 50, type: 'textarea', fontSize: 12},
    {id: 'weapons', x: 594, y: 417, width: 177, height: 12, type: 'text', fontSize: 12},
    {id: 'armor', x: 583, y: 432, width: 187, height: 12, type: 'text', fontSize: 12},
    {id: 'tools', x: 579, y: 447, width: 191, height: 12, type: 'text', fontSize: 12},
    {id: 'advantages', x: 548, y: 474, width: 224, height: 12, type: 'text', fontSize: 12},
    {id: 'disadvantages', x: 548, y: 500, width: 224, height: 12, type: 'text', fontSize: 12},
    {id: 'featuresAndTraits', x: 548, y: 528, width: 224, height: 504, type: 'textarea', fontSize: 12},
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
