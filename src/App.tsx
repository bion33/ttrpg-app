import {useCallback, useState} from 'react'
import {createStore, Provider} from 'jotai'
import {Toaster} from 'sonner'
import AppContent from './AppContent.tsx'
import {StorageRemountContext} from './hooks/useStorage.ts'

/**
 * Application root; holds the jotai store so a storage load can swap it (making `atomWithStorage` atoms re-read the
 * bulk-rewritten localStorage) and provides that swap as the storage remount callback.
 */
function App() {
    const [store, setStore] = useState(() => createStore())
    const remount = useCallback(() => setStore(createStore()), [])
    return (
        <StorageRemountContext.Provider value={remount}>
            <Provider store={store}>
                <AppContent/>
            </Provider>
            <Toaster position="top-left" offset={{top: '1.5rem', left: '5.5rem'}}/>
        </StorageRemountContext.Provider>
    )
}

export default App
