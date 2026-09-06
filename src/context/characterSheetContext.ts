import {createContext} from 'react'
import type {CharacterSheetData} from '../types'

export interface CharacterSheetContextValue {
    sheet: CharacterSheetData
    updateSheet: (updater: (sheet: CharacterSheetData) => CharacterSheetData) => void
    resetSheet: () => void
}

export const CharacterSheetContext =
    createContext<CharacterSheetContextValue | null>(null)
