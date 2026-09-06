import {InkCheckbox} from '../shared/InkCheckbox/InkCheckbox'
import {SectionLabel} from '../shared/SectionLabel/SectionLabel'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './DeathSavesSection.module.css'

export function DeathSavesSection() {
    const {sheet, updateSheet} = useCharacterSheet()
    const {deathSaves} = sheet

    function toggleFailure(index: number, checked: boolean) {
        updateSheet((current) => {
            const failures = [...current.deathSaves.failures] as [
                boolean,
                boolean,
                boolean,
            ]
            failures[index] = checked
            return {
                ...current,
                deathSaves: {...current.deathSaves, failures},
            }
        })
    }

    function toggleSuccess(index: number, checked: boolean) {
        updateSheet((current) => {
            const successes = [...current.deathSaves.successes] as [
                boolean,
                boolean,
                boolean,
            ]
            successes[index] = checked
            return {
                ...current,
                deathSaves: {...current.deathSaves, successes},
            }
        })
    }

    return (
        <div className={styles.section}>
            <div className={styles.panel}>
                <div className={`${styles.group} ${styles['group--failure']}`}>
                    {deathSaves.failures.map((checked, index) => (
                        <InkCheckbox
                            key={index}
                            checked={checked}
                            onChange={(next) => toggleFailure(index, next)}
                            aria-label={`Death save failure ${index + 1}`}
                        />
                    ))}
                </div>
                <img src="/assets/reaper.png" alt="" className={styles.icon} aria-hidden="true" />
                <img
                    src="/assets/angel.png"
                    alt=""
                    className={`${styles.icon} ${styles['icon--flipped']}`}
                    aria-hidden="true"
                />
                <div className={`${styles.group} ${styles['group--success']}`}>
                    {deathSaves.successes.map((checked, index) => (
                        <InkCheckbox
                            key={index}
                            checked={checked}
                            onChange={(next) => toggleSuccess(index, next)}
                            aria-label={`Death save success ${index + 1}`}
                        />
                    ))}
                </div>
                <div className={styles.panelLabel}>
                    <SectionLabel>Death Saves</SectionLabel>
                </div>
            </div>
        </div>
    )
}
