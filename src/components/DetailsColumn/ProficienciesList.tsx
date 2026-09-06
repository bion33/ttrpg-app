import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import type {ProficienciesData} from '../../types'
import styles from './ProficienciesList.module.css'

const PROFICIENCY_FIELDS: { key: keyof ProficienciesData; label: string }[] = [
    {key: 'languages', label: 'Languages'},
    {key: 'weaponProficiencies', label: 'Weapon Proficiencies'},
    {key: 'armourProficiencies', label: 'Armour Proficiencies'},
    {key: 'toolProficiencies', label: 'Tool Proficiencies'},
    {key: 'advantages', label: 'Advantages'},
    {key: 'disadvantages', label: 'Disadvantages'},
]

export function ProficienciesList() {
    const {sheet, updateSheet} = useCharacterSheet()

    function setField(key: keyof ProficienciesData, value: string) {
        updateSheet((current) => ({
            ...current,
            proficiencies: {...current.proficiencies, [key]: value},
        }))
    }

    return (
        <div className={styles.list}>
            {PROFICIENCY_FIELDS.map(({key, label}) => (
                <div key={key} className={styles.field}>
                    <SheetField
                        label={label}
                        value={sheet.proficiencies[key]}
                        onChange={(value) => setField(key, value)}
                        labelPosition="top"
                    />
                </div>
            ))}
        </div>
    )
}
