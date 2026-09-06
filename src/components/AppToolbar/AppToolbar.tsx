import {useCharacterSheet} from '../../context/useCharacterSheet'
import styles from './AppToolbar.module.css'

export function AppToolbar() {
    const {resetSheet} = useCharacterSheet()

    function handleReset() {
        if (confirm('Clear the entire character sheet? This cannot be undone.')) {
            resetSheet()
        }
    }

    return (
        <div className={styles.toolbar}>
            <span className={styles.title}>Character Sheet</span>
            <button type="button" className={styles.resetButton} onClick={handleReset}>
                Reset Sheet
            </button>
        </div>
    )
}
