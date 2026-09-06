import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './NotesSection.module.css'

export function NotesSection() {
    const {sheet, updateSheet} = useCharacterSheet()

    return (
        <div className={styles.section}>
            <SheetField
                label="Notes"
                value={sheet.notes}
                onChange={(value) =>
                    updateSheet((current) => ({...current, notes: value}))
                }
                labelPosition="top"
                multiline
            />
        </div>
    )
}
