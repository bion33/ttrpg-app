import {AbilityBlock} from '../AbilityBlock/AbilityBlock'
import {ProficiencyStatsRow} from './ProficiencyStatsRow'
import {ABILITY_DEFINITIONS} from '../../data/abilities'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './AbilitiesColumn.module.css'

export function AbilitiesColumn() {
    const {sheet, updateSheet} = useCharacterSheet()

    return (
        <div className={styles.column}>
            <ProficiencyStatsRow/>
            {ABILITY_DEFINITIONS.map((definition) => (
                <AbilityBlock
                    key={definition.key}
                    definition={definition}
                    data={sheet.abilities[definition.key]}
                    proficiencyBonus={sheet.proficiencyBonus}
                    onChange={(data) =>
                        updateSheet((current) => ({
                            ...current,
                            abilities: {...current.abilities, [definition.key]: data},
                        }))
                    }
                />
            ))}
        </div>
    )
}
