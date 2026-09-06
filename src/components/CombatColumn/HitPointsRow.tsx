import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './HitPointsRow.module.css'

export function HitPointsRow() {
    const {sheet, updateSheet} = useCharacterSheet()
    const {combat} = sheet

    function setField(key: 'totalHp' | 'currentHp' | 'temporaryHp', value: string) {
        updateSheet((current) => ({
            ...current,
            combat: {...current.combat, [key]: value},
        }))
    }

    return (
        <div className={styles.row}>
            <div className={styles.fieldTall}>
                <SheetField
                    label="Total HP"
                    value={combat.totalHp}
                    onChange={(value) => setField('totalHp', value)}
                />
            </div>

            <div className={styles.currentHp}>
                <span className={styles.currentHpLabel}>Current Hit Points</span>
                <input
                    className={styles.currentHpInput}
                    value={combat.currentHp}
                    onChange={(event) => setField('currentHp', event.target.value)}
                    aria-label="Current Hit Points"
                />
            </div>

            <div className={styles.fieldTall}>
                <SheetField
                    label="Temporary HP"
                    value={combat.temporaryHp}
                    onChange={(value) => setField('temporaryHp', value)}
                />
            </div>
        </div>
    )
}
