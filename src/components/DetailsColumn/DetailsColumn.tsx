import {HitDiceSection} from './HitDiceSection'
import {DeathSavesSection} from './DeathSavesSection'
import {ResistancesField} from './ResistancesField'
import {ProficienciesList} from './ProficienciesList'
import {FeaturesField} from './FeaturesField'
import styles from './DetailsColumn.module.css'

export function DetailsColumn() {
    return (
        <div className={styles.column}>
            <div className={styles.topRow}>
                <HitDiceSection/>
                <DeathSavesSection/>
            </div>

            <ResistancesField/>
            <ProficienciesList/>
            <FeaturesField/>
        </div>
    )
}
