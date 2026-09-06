import {InkCheckbox} from '../shared/InkCheckbox/InkCheckbox'
import {DiamondCheckbox} from '../shared/DiamondCheckbox/DiamondCheckbox'
import type {AbilityDefinition} from '../../data/abilities'
import {abilityModifier, formatModifier} from '../../data/abilities'
import type {AbilityData, SkillData} from '../../types'
import styles from './AbilityBlock.module.css'

interface AbilityBlockProps {
    definition: AbilityDefinition
    data: AbilityData
    proficiencyBonus: number
    onChange: (data: AbilityData) => void
}

function SkillRow({
                      label,
                      skill,
                      modifier,
                      proficiencyBonus,
                      onChange,
                      isSave = false,
                  }: {
    label: string
    skill: SkillData
    modifier: number
    proficiencyBonus: number
    onChange: (skill: SkillData) => void
    isSave?: boolean
}) {
    const proficiencyMultiplier = skill.proficient ? (skill.expertise ? 2 : 1) : 0
    const bonus = modifier + proficiencyMultiplier * proficiencyBonus

    return (
        <li className={styles.row}>
            {!isSave && (
                <InkCheckbox
                    small
                    checked={skill.expertise}
                    onChange={(expertise) => onChange({...skill, expertise})}
                    className={styles.expertise}
                    aria-label={`${label} expertise`}
                />
            )}
            {isSave ? (
                <DiamondCheckbox
                    checked={skill.proficient}
                    onChange={(proficient) => onChange({...skill, proficient})}
                    aria-label={`${label} proficiency`}
                />
            ) : (
                <InkCheckbox
                    checked={skill.proficient}
                    onChange={(proficient) => onChange({...skill, proficient})}
                    aria-label={`${label} proficiency`}
                />
            )}
            <span className={styles.rowBonus}>{formatModifier(bonus)}</span>
            <span className={`${styles.rowLabel} ${isSave ? styles['rowLabel--save'] : ''}`}>
                {label}
            </span>
        </li>
    )
}

export function AbilityBlock({definition, data, proficiencyBonus, onChange}: AbilityBlockProps) {
    const modifier = abilityModifier(data.score, data.scoreBonus)

    return (
        <div className={styles.block}>
            <div className={styles.scoreArea}>
                <div className={styles.modifier}>
                    <div className={`${styles.scoreCircle} ${styles['scoreCircle--top']}`}>
                        <input
                            type="number"
                            className={styles.scoreInput}
                            value={data.score}
                            onChange={(event) =>
                                onChange({...data, score: Number(event.target.value) || 0})
                            }
                            aria-label={`${definition.name} score`}
                        />
                    </div>
                    <div className={`${styles.scoreCircle} ${styles['scoreCircle--bottom']}`}>
                        <input
                            type="number"
                            className={styles.scoreInput}
                            value={data.scoreBonus}
                            onChange={(event) =>
                                onChange({...data, scoreBonus: Number(event.target.value) || 0})
                            }
                            aria-label={`${definition.name} score bonus`}
                        />
                    </div>
                    {formatModifier(modifier)}
                </div>
            </div>

            <ul className={styles.rows}>
                <div className={styles.name}>{definition.name}</div>

                <SkillRow
                    label="Saving Throw"
                    skill={data.save}
                    modifier={modifier}
                    proficiencyBonus={proficiencyBonus}
                    onChange={(save) => onChange({...data, save})}
                    isSave
                />
                {definition.skills.map((skillName) => (
                    <SkillRow
                        key={skillName}
                        label={skillName}
                        skill={data.skills[skillName]}
                        modifier={modifier}
                        proficiencyBonus={proficiencyBonus}
                        onChange={(skill) =>
                            onChange({
                                ...data,
                                skills: {...data.skills, [skillName]: skill},
                            })
                        }
                    />
                ))}
            </ul>
        </div>
    )
}
