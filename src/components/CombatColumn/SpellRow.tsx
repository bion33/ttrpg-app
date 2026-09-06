import {InkCheckbox} from '../shared/InkCheckbox/InkCheckbox'
import type {Spell} from '../../types'
import styles from './SpellsTable.module.css'

const SPELL_COMPONENTS: {
    key: 'somatic' | 'verbal' | 'material'
    label: string
}[] = [
    {key: 'somatic', label: 's'},
    {key: 'verbal', label: 'v'},
    {key: 'material', label: 'm'},
]

interface SpellRowProps {
    spell: Spell
    onChange: (spell: Spell) => void
}

export function SpellRow({spell, onChange}: SpellRowProps) {
    return (
        <div className={styles.row}>
            <InkCheckbox
                small
                checked={spell.prepared}
                onChange={(prepared) => onChange({...spell, prepared})}
                aria-label="Prepared"
            />
            <input
                className={styles.input}
                value={spell.name}
                onChange={(event) => onChange({...spell, name: event.target.value})}
                aria-label="Spell name"
            />
            <input
                className={styles.input}
                value={spell.details}
                onChange={(event) =>
                    onChange({...spell, details: event.target.value})
                }
                aria-label="Damage, type, DC & save"
            />
            <div className={styles.components}>
                {SPELL_COMPONENTS.map(({key, label}) => (
                    <div key={key} className={styles.component}>
                        <InkCheckbox
                            small
                            checked={spell[key]}
                            onChange={(checked) => onChange({...spell, [key]: checked})}
                            aria-label={label}
                        />
                        <span className={styles.componentLabel}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
