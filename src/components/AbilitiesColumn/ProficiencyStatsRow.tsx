import {useCharacterSheet} from '../../context/useCharacterSheet'
import {abilityModifier} from '../../data/abilities'
import styles from './ProficiencyStatsRow.module.css'

function passivePerception(proficiencyBonus: number, wis: {
    score: number
    scoreBonus: number
    skills: Record<string, { proficient: boolean; expertise: boolean }>
}): number {
    const perception = wis.skills['Perception']
    const proficiencyMultiplier = perception?.proficient ? (perception.expertise ? 2 : 1) : 0
    return 10 + abilityModifier(wis.score, wis.scoreBonus) + proficiencyMultiplier * proficiencyBonus
}

export function ProficiencyStatsRow() {
    const {sheet, updateSheet} = useCharacterSheet()

    function setProficiencyBonus(value: number) {
        updateSheet((current) => ({...current, proficiencyBonus: value}))
    }

    return (
        <div className={styles.row}>
            <div className={styles.stat}>
                <div className={styles.circle}>
                    <input
                        type="number"
                        className={styles.input}
                        value={sheet.proficiencyBonus}
                        onChange={(event) => setProficiencyBonus(Number(event.target.value) || 0)}
                        aria-label="Proficiency"
                    />
                </div>
                <div className={styles.label}>Proficiency</div>
            </div>
            <div className={styles.stat}>
                <div className={styles.circle}>
                    <span className={styles.input} aria-label="Passive Perception">
                        {passivePerception(sheet.proficiencyBonus, sheet.abilities.wis)}
                    </span>
                </div>
                <div className={styles.label}>Passive Perception</div>
            </div>
        </div>
    )
}
