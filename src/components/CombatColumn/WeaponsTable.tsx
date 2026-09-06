import {WeaponRow} from './WeaponRow'
import {SectionLabel} from '../shared/SectionLabel/SectionLabel'
import {ColumnHeading} from '../shared/ColumnHeading/ColumnHeading'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './WeaponsTable.module.css'

export function WeaponsTable() {
    const {sheet, updateSheet} = useCharacterSheet()

    function setWeapon(index: number, weapon: typeof sheet.weapons[number]) {
        updateSheet((current) => ({
            ...current,
            weapons: current.weapons.map((existing, i) =>
                i === index ? weapon : existing,
            ),
        }))
    }

    return (
        <div className={styles.section}>
            <SectionLabel>Weapons</SectionLabel>

            <div className={styles.headerRow}>
                <ColumnHeading>weapon</ColumnHeading>
                <ColumnHeading>atk</ColumnHeading>
                <ColumnHeading>damage &amp; effects</ColumnHeading>
                <div/>
            </div>

            {sheet.weapons.map((weapon, index) => (
                <WeaponRow
                    key={index}
                    weapon={weapon}
                    onChange={(next) => setWeapon(index, next)}
                />
            ))}
        </div>
    )
}
