import {useCharacterSheet} from '../../context/useCharacterSheet'
import type {HitDiceTrack} from '../../types'
import styles from './HitDiceSection.module.css'

const CELLS: { index: 0 | 1; field: 'total' | 'used' }[] = [
    {index: 0, field: 'total'},
    {index: 1, field: 'total'},
    {index: 0, field: 'used'},
    {index: 1, field: 'used'},
]

export function HitDiceSection() {
    const {sheet, updateSheet} = useCharacterSheet()

    function setTrack(index: 0 | 1, track: HitDiceTrack) {
        updateSheet((current) => {
            const hitDice = [...current.hitDice] as [HitDiceTrack, HitDiceTrack]
            hitDice[index] = track
            return {...current, hitDice}
        })
    }

    return (
        <div className={styles.section}>
            <div className={styles.octagonBlock}>
                <div className={styles.octagon}>
                    <div className={styles.octagonInner}>
                        {CELLS.map(({index, field}) => {
                            const track = sheet.hitDice[index]
                            return (
                                <input
                                    key={`${field}-${index}`}
                                    type="number"
                                    className={styles.octagonInput}
                                    value={track[field]}
                                    onChange={(event) =>
                                        setTrack(index, {...track, [field]: Number(event.target.value) || 0})
                                    }
                                />
                            )
                        })}
                        <div className={styles.octagonDivider}/>
                    </div>
                </div>
                <span className={`${styles.octagonLabel} ${styles['octagonLabel--topLeft']}`}>Total</span>
                <span className={`${styles.octagonLabel} ${styles['octagonLabel--topRight']}`}>Total</span>
                <span className={`${styles.octagonLabel} ${styles['octagonLabel--bottomLeft']}`}>Used</span>
                <span className={`${styles.octagonLabel} ${styles['octagonLabel--bottomRight']}`}>Used</span>
            </div>
        </div>
    )
}
