import {useContext} from 'react'
import {CharacterSheetContext} from './characterSheetContext'

export function useCharacterSheet() {
    const context = useContext(CharacterSheetContext)
    if (!context) {
        throw new Error(
            'useCharacterSheet must be used within a CharacterSheetProvider',
        )
    }
    return context
}
