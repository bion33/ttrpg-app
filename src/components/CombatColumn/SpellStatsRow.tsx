import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import type {SpellStatsData} from '../../types'
import styles from './SpellStatsRow.module.css'

const SPELL_STAT_FIELDS: { key: keyof SpellStatsData; label: string }[] = [
    {key: 'spellDc', label: 'Spell DC'},
    {key: 'spellAttack', label: 'Spell Attack'},
    {key: 'customStatOne', label: 'Custom Stat'},
    {key: 'customStatTwo', label: 'Custom Stat'},
]

export function SpellStatsRow() {
    const {sheet, updateSheet} = useCharacterSheet()

    function setField(key: keyof SpellStatsData, value: number) {
        updateSheet((current) => ({
            ...current,
            spellStats: {...current.spellStats, [key]: value},
        }))
    }

    return (
        <div className={styles.row}>
            {SPELL_STAT_FIELDS.map(({key, label}) => (
                <SheetField
                    type="number"
                    key={key}
                    label={label}
                    value={sheet.spellStats[key]}
                    onChange={(value) => setField(key, value)}
                />
            ))}
        </div>
    )
}
