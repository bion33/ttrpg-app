import {VitalsRow} from './VitalsRow'
import {HitPointsRow} from './HitPointsRow'
import {WeaponsTable} from './WeaponsTable'
import {SpellsTable} from './SpellsTable'
import {SpellSlotsTable} from './SpellSlotsTable'
import {SpellStatsRow} from './SpellStatsRow'
import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './CombatColumn.module.css'

export function CombatColumn() {
    const {sheet, updateSheet} = useCharacterSheet()

    return (
        <div className={styles.column}>
            <VitalsRow/>
            <HitPointsRow/>

            <div className={styles.conditions}>
                <SheetField
                    label="Buffs, Debuffs & Conditions"
                    value={sheet.combat.conditions}
                    onChange={(value) =>
                        updateSheet((current) => ({
                            ...current,
                            combat: {...current.combat, conditions: value},
                        }))
                    }
                    labelPosition="top"
                    multiline
                />
            </div>

            <WeaponsTable/>
            <SpellsTable/>
            <SpellSlotsTable/>
            <SpellStatsRow/>
        </div>
    )
}
