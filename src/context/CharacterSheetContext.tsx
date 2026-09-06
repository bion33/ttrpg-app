import type {ReactNode} from 'react'
import {useMemo} from 'react'
import type {CharacterSheetContextValue} from './characterSheetContext'
import {CharacterSheetContext} from './characterSheetContext'
import {createDefaultCharacterSheet} from '../data/defaultCharacterSheet'
import {useLocalStorageState} from '../hooks/useLocalStorageState'

const STORAGE_KEY = 'dnd-character-sheet'

export function CharacterSheetProvider({children}: { children: ReactNode }) {
    const [sheet, setSheet] = useLocalStorageState(
        STORAGE_KEY,
        createDefaultCharacterSheet,
    )

    const value = useMemo<CharacterSheetContextValue>(
        () => ({
            sheet,
            updateSheet: setSheet,
            resetSheet: () => setSheet(createDefaultCharacterSheet()),
        }),
        [sheet, setSheet],
    )

    return (
        <CharacterSheetContext.Provider value={value}>
            {children}
        </CharacterSheetContext.Provider>
    )
}
