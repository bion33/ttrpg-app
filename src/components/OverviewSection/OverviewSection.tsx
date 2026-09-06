import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'
import type {OverviewData} from '../../types'
import styles from './OverviewSection.module.css'

const DETAIL_FIELDS: { key: keyof OverviewData; label: string }[] = [
    {key: 'classAndLevel', label: 'Class & Level'},
    {key: 'background', label: 'Background'},
    {key: 'playerName', label: 'Player Name'},
    {key: 'raceAndSize', label: 'Race & Size'},
    {key: 'alignment', label: 'Alignment'},
    {key: 'experiencePoints', label: 'Experience Points'},
]

export function OverviewSection() {
    const {sheet, updateSheet} = useCharacterSheet()
    const {overview} = sheet

    function setField(key: keyof OverviewData, value: string) {
        updateSheet((current) => ({
            ...current,
            overview: {...current.overview, [key]: value},
        }))
    }

    return (
        <section className={styles.section}>
            <div className={styles.identity}>
                <h1 className={styles.heading}>Overview</h1>
                <div className={styles.nameField}>
                    <SheetField
                        label="Character Name"
                        value={overview.characterName}
                        onChange={(value) => setField('characterName', value)}
                    />
                </div>
            </div>

            <div className={styles.details}>
                {DETAIL_FIELDS.map(({key, label}) => (
                    <SheetField
                        key={key}
                        label={label}
                        value={overview[key]}
                        onChange={(value) => setField(key, value)}
                        labelPosition="bottom"
                    />
                ))}
            </div>
        </section>
    )
}
