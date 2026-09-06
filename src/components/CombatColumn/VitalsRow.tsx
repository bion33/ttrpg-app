import {SheetField} from '../shared/SheetField/SheetField'
import {InkCheckbox} from '../shared/InkCheckbox/InkCheckbox'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import type {CombatData} from '../../types'
import styles from './VitalsRow.module.css'

const SPEED_FIELDS: { key: 'run' | 'climb' | 'swim' | 'fly'; label: string }[] = [
    {key: 'run', label: 'Run'},
    {key: 'climb', label: 'Climb'},
    {key: 'swim', label: 'Swim'},
    {key: 'fly', label: 'Fly'},
]

const SPEED_CORNER_CLASS: Record<'run' | 'climb' | 'swim' | 'fly', string> = {
    run: 'speedLabel--run',
    climb: 'speedLabel--climb',
    swim: 'speedLabel--swim',
    fly: 'speedLabel--fly',
}

export function VitalsRow() {
    const {sheet, updateSheet} = useCharacterSheet()
    const {combat} = sheet

    function setField(key: keyof CombatData, value: number) {
        updateSheet((current) => ({
            ...current,
            combat: {...current.combat, [key]: value},
        }))
    }

    function setHalveClimbSwim(value: boolean) {
        updateSheet((current) => ({
            ...current,
            combat: {...current.combat, halveClimbSwim: value},
        }))
    }

    const speedValues: Record<'run' | 'climb' | 'swim' | 'fly', number> = {
        run: combat.run,
        climb: combat.halveClimbSwim ? combat.run / 2 : combat.climb,
        swim: combat.halveClimbSwim ? combat.run / 2 : combat.swim,
        fly: combat.fly,
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

            <div className={styles.speedBlock}>
                <div className={styles.speedGrid}>
                    <div className={styles.speedGridInner}>
                        {SPEED_FIELDS.map(({key}) => {
                            const derived = combat.halveClimbSwim && (key === 'climb' || key === 'swim')
                            return (
                                <input
                                    key={key}
                                    type="number"
                                    className={styles.speedInput}
                                    value={speedValues[key]}
                                    readOnly={derived}
                                    onChange={(event) => {
                                        if (derived) return
                                        setField(key, Number(event.target.value) || 0)
                                    }}
                                />
                            )
                        })}
                        <div className={styles.speedDivider} />
                    </div>
                </div>
                {SPEED_FIELDS.map(({key, label}) => (
                    <span key={key} className={`${styles.speedLabel} ${styles[SPEED_CORNER_CLASS[key]]}`}>
                        {label}
                    </span>
                ))}
                <InkCheckbox
                    className={styles.halveCheckbox}
                    small
                    checked={combat.halveClimbSwim}
                    onChange={setHalveClimbSwim}
                    aria-label="Halve climb and swim speed"
                />
            </div>
        </div>
    )
}
