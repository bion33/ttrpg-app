import {useCallback, useState} from 'react'
import {Provider, createStore} from 'jotai'
import Library from './components/features/Library/Library.tsx'
import {useNavigationHistory} from './hooks/useNavigation.ts'
import {StorageRemountContext} from './hooks/useStorage.ts'

/**
 * The app's contents inside the jotai store: wires location to browser history and renders the library of binders.
 */
function AppContent() {
    useNavigationHistory()
    return <Library/>
}

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
        </StorageRemountContext.Provider>
    )
}

export default App
