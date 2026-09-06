import {SpellRow} from './SpellRow'
import {SectionLabel} from '../shared/SectionLabel/SectionLabel'
import {ColumnHeading} from '../shared/ColumnHeading/ColumnHeading'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './SpellsTable.module.css'

export function SpellsTable() {
    const {sheet, updateSheet} = useCharacterSheet()

    function setSpell(index: number, spell: typeof sheet.spells[number]) {
        updateSheet((current) => ({
            ...current,
            spells: current.spells.map((existing, i) =>
                i === index ? spell : existing,
            ),
        }))
    }

    return (
        <div className={styles.section}>
            <SectionLabel>Cantrips &amp; Spells</SectionLabel>

            <div className={styles.headerRow}>
                <div/>
                <ColumnHeading>prepared / name</ColumnHeading>
                <ColumnHeading>damage / type / dc / save</ColumnHeading>
                <div/>
            </div>

            {sheet.spells.map((spell, index) => (
                <SpellRow
                    key={index}
                    spell={spell}
                    onChange={(next) => setSpell(index, next)}
                />
            ))}
        </div>
    )
}
