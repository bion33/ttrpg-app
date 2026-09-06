import {OverviewSection} from '../OverviewSection/OverviewSection'
import {AbilitiesColumn} from '../AbilitiesColumn/AbilitiesColumn'
import {CombatColumn} from '../CombatColumn/CombatColumn'
import {DetailsColumn} from '../DetailsColumn/DetailsColumn'
import {NotesSection} from '../NotesSection/NotesSection'
import styles from './CharacterSheet.module.css'

export function CharacterSheet() {
    return (
        <main className={styles.page}>
            <OverviewSection/>
            <div className={styles.divider}/>

            <div className={styles.grid}>
                <AbilitiesColumn/>
                <CombatColumn/>
                <div className={styles.details}>
                    <DetailsColumn/>
                </div>
                <div className={styles.notes}>
                    <NotesSection/>
                </div>
            </div>
        </main>
    )
}
