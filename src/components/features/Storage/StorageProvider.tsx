import type {ReactNode} from 'react'
import {useStorage} from '@hooks/useStorage.ts'
import {useSaveShortcut} from '@hooks/useSaveShortcut.ts'
import {StorageContext} from './storageContext.ts'

/**
 * Holds a single `useStorage` instance for the whole app so navigating between the library and a binder does not
 * remount it (which would re-probe the cloud remote on every crossing).
 */
export function StorageProvider({children}: { children: ReactNode }) {
    const storage = useStorage()
    useSaveShortcut(storage.save)
    return <StorageContext.Provider value={storage}>{children}</StorageContext.Provider>
}
