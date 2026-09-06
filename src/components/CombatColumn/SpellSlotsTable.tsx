import {SectionLabel} from '../shared/SectionLabel/SectionLabel'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import {SPELL_LEVELS} from '../../data/defaultCharacterSheet'
import type {SpellSlot} from '../../types'
import styles from './SpellSlotsTable.module.css'

export function SpellSlotsTable() {
    const {sheet, updateSheet} = useCharacterSheet()

    function setSlot(index: number, slot: SpellSlot) {
        updateSheet((current) => ({
            ...current,
            spellSlots: current.spellSlots.map((existing, i) =>
                i === index ? slot : existing,
            ),
        }))
    }

    return (
        <div className={styles.section}>
            <SectionLabel>Spell Slots</SectionLabel>
            <div className={styles.grid}>
                <div/>
                {SPELL_LEVELS.map((level) => (
                    <div key={level} className={styles.level}>
                        {level}
                    </div>
                ))}

                <div className={styles.rowLabel}>total</div>
                {sheet.spellSlots.map((slot, index) => (
                    <input
                        type="number"
                        key={index}
                        className={styles.input}
                        value={slot.total}
                        onChange={(event) =>
                            setSlot(index, {...slot, total: Number(event.target.value) || 0})
                        }
                        aria-label={`Level ${SPELL_LEVELS[index]} total slots`}
                    />
                ))}

                <div className={styles.rowLabel}>used</div>
                {sheet.spellSlots.map((slot, index) => (
                    <input
                        type="number"
                        key={index}
                        className={`${styles.input} ${styles.inputUsed}`}
                        value={slot.used}
                        onChange={(event) =>
                            setSlot(index, {...slot, used: Number(event.target.value) || 0})
                        }
                        aria-label={`Level ${SPELL_LEVELS[index]} used slots`}
                    />
                ))}
            </div>
        </div>
    )
}
