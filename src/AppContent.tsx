import Library from './components/features/Library/Library.tsx'
import {StorageProvider} from './components/features/Storage/StorageProvider.tsx'
import {useNavigationHistory} from './hooks/useNavigation.ts'

/**
 * The app's contents inside the jotai store: wires location to browser history and renders the library of binders,
 * holding the shared storage orchestration above the library/binder switch so navigation does not remount it.
 */
function AppContent() {
    useNavigationHistory()
    return (
        <StorageProvider>
            <Library/>
        </StorageProvider>
    )
}

export default AppContent
