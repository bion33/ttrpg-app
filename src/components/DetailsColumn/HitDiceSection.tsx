import {SheetField} from '../shared/SheetField/SheetField'
import {SectionLabel} from '../shared/SectionLabel/SectionLabel'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import type {HitDiceTrack} from '../../types'
import styles from './HitDiceSection.module.css'

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
            <SectionLabel>Hit Dice</SectionLabel>
            <div className={styles.grid}>
                {sheet.hitDice.map((track, index) => (
                    <SheetField
                        type="number"
                        key={`total-${index}`}
                        label="Total"
                        value={track.total}
                        onChange={(value) =>
                            setTrack(index as 0 | 1, {...track, total: value})
                        }
                    />
                ))}
                {sheet.hitDice.map((track, index) => (
                    <SheetField
                        type="number"
                        key={`used-${index}`}
                        label="Used"
                        value={track.used}
                        onChange={(value) =>
                            setTrack(index as 0 | 1, {...track, used: value})
                        }
                    />
                ))}
            </div>
        </div>
    )
}
