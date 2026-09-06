import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './FeaturesField.module.css'

export function FeaturesField() {
    const {sheet, updateSheet} = useCharacterSheet()

    return (
        <div className={styles.field}>
            <SheetField
                label="Features & Traits"
                value={sheet.features}
                onChange={(value) =>
                    updateSheet((current) => ({...current, features: value}))
                }
                labelPosition="top"
                multiline
            />
        </div>
    )
}
