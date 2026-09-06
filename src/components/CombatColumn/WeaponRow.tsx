import {InkCheckbox} from '../shared/InkCheckbox/InkCheckbox'
import type {Weapon} from '../../types'
import styles from './WeaponsTable.module.css'

const DAMAGE_TYPES: { key: 'slash' | 'pierce' | 'blunt'; label: string }[] = [
    {key: 'slash', label: 's'},
    {key: 'pierce', label: 'p'},
    {key: 'blunt', label: 'b'},
]

interface WeaponRowProps {
    weapon: Weapon
    onChange: (weapon: Weapon) => void
}

export function WeaponRow({weapon, onChange}: WeaponRowProps) {
    return (
        <div className={styles.row}>
            <input
                className={styles.input}
                value={weapon.name}
                onChange={(event) => onChange({...weapon, name: event.target.value})}
                aria-label="Weapon name"
            />
            <input
                type="number"
                className={`${styles.input} ${styles.inputCentered}`}
                value={weapon.attack}
                onChange={(event) =>
                    onChange({...weapon, attack: Number(event.target.value) || 0})
                }
                aria-label="Attack bonus"
            />
            <input
                className={styles.input}
                value={weapon.damage}
                onChange={(event) =>
                    onChange({...weapon, damage: event.target.value})
                }
                aria-label="Damage & effects"
            />
            <div className={styles.damageTypes}>
                {DAMAGE_TYPES.map(({key, label}) => (
                    <div key={key} className={styles.damageType}>
                        <InkCheckbox
                            small
                            checked={weapon[key]}
                            onChange={(checked) => onChange({...weapon, [key]: checked})}
                            aria-label={label}
                        />
                        <span className={styles.damageTypeLabel}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
