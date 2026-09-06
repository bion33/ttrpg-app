import {useCharacterSheet} from '../../context/useCharacterSheet'
import type {CharacterSheetData} from '../../types'
import styles from './ProficiencyStatsRow.module.css'

const STAT_FIELDS: { key: keyof Pick<CharacterSheetData, 'proficiencyBonus' | 'passivePerception'>; label: string }[] = [
    {key: 'proficiencyBonus', label: 'Proficiency'},
    {key: 'passivePerception', label: 'Passive Perception'},
]

export function ProficiencyStatsRow() {
    const {sheet, updateSheet} = useCharacterSheet()

    function setField(key: keyof CharacterSheetData, value: number) {
        updateSheet((current) => ({...current, [key]: value}))
    }

    return (
        <div className={styles.row}>
            {STAT_FIELDS.map(({key, label}) => (
                <div className={styles.stat} key={key}>
                    <div className={styles.circle}>
                        <input
                            type="number"
                            className={styles.input}
                            value={sheet[key]}
                            onChange={(event) => setField(key, Number(event.target.value) || 0)}
                            aria-label={label}
                        />
                    </div>
                    <div className={styles.label}>{label}</div>
                </div>
            ))}
        </div>
    )
}
