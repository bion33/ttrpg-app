import {createContext, useContext} from 'react'
import type {UseStorage} from '@hooks/useStorage.ts'

/** The shared storage orchestration, provided by `StorageProvider` and `null` outside it. */
export const StorageContext = createContext<UseStorage | null>(null)

/**
 * Reads the app-wide storage orchestration provided by `StorageProvider`.
 */
export function useStorageContext(): UseStorage {
    const storage = useContext(StorageContext)
    if (!storage) throw new Error('useStorageContext must be used within a StorageProvider')
    return storage
}
