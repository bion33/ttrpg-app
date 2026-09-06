import {InkCheckbox} from '../shared/InkCheckbox/InkCheckbox'
import type {AbilityDefinition} from '../../data/abilities'
import {abilityModifier, formatModifier} from '../../data/abilities'
import type {AbilityData, SkillData} from '../../types'
import styles from './AbilityBlock.module.css'

interface AbilityBlockProps {
    definition: AbilityDefinition
    data: AbilityData
    onChange: (data: AbilityData) => void
}

function SkillRow({
                      label,
                      skill,
                      onChange,
                      isSave = false,
                  }: {
    label: string
    skill: SkillData
    onChange: (skill: SkillData) => void
    isSave?: boolean
}) {
    return (
        <li className={styles.row}>
            <InkCheckbox
                checked={skill.proficient}
                onChange={(proficient) => onChange({...skill, proficient})}
                aria-label={`${label} proficiency`}
            />
            <input
                type="number"
                className={styles.rowBonus}
                value={skill.bonus}
                onChange={(event) => onChange({...skill, bonus: Number(event.target.value) || 0})}
                aria-label={`${label} bonus`}
            />
            <span className={`${styles.rowLabel} ${isSave ? styles['rowLabel--save'] : ''}`}>
                {label}
            </span>
        </li>
    )
}

export function AbilityBlock({definition, data, onChange}: AbilityBlockProps) {
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
                    onChange={(save) => onChange({...data, save})}
                    isSave
                />
                {definition.skills.map((skillName) => (
                    <SkillRow
                        key={skillName}
                        label={skillName}
                        skill={data.skills[skillName]}
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
