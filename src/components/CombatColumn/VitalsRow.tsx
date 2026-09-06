import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import type {CombatData} from '../../types'
import styles from './VitalsRow.module.css'

const SPEED_FIELDS: { key: 'run' | 'climb' | 'swim' | 'fly'; label: string }[] = [
    {key: 'run', label: 'Run'},
    {key: 'climb', label: 'Climb'},
    {key: 'swim', label: 'Swim'},
    {key: 'fly', label: 'Fly'},
]

export function VitalsRow() {
    const {sheet, updateSheet} = useCharacterSheet()
    const {combat} = sheet

    function setField(key: keyof CombatData, value: number) {
        updateSheet((current) => ({
            ...current,
            combat: {...current.combat, [key]: value},
        }))
    }

    return (
        <div className={styles.row}>
            <div className={styles.stack}>
                <div className={styles.fieldTall}>
                    <SheetField
                        type="number"
                        label="Armour Class"
                        value={combat.armourClass}
                        onChange={(value) => setField('armourClass', value)}
                    />
                </div>
                <div className={styles.fieldShort}>
                    <SheetField
                        type="number"
                        label="Shield"
                        value={combat.shield}
                        onChange={(value) => setField('shield', value)}
                    />
                </div>
            </div>

            <div className={styles.stack}>
                <div className={styles.fieldShort}>
                    <SheetField
                        type="number"
                        label="Darkvision"
                        value={combat.darkvision}
                        onChange={(value) => setField('darkvision', value)}
                    />
                </div>
                <div className={styles.fieldShort}>
                    <SheetField
                        type="number"
                        label="Initiative"
                        value={combat.initiative}
                        onChange={(value) => setField('initiative', value)}
                    />
                </div>
            </div>

            <div className={styles.speedGrid}>
                {SPEED_FIELDS.map(({key, label}) => (
                    <SheetField
                        type="number"
                        key={key}
                        label={label}
                        value={combat[key]}
                        onChange={(value) => setField(key, value)}
                    />
                ))}
            </div>
        </div>
    )
}
