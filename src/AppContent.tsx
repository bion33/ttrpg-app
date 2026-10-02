import Library from './components/features/Library/Library.tsx'
import TemplateEditor from '@features/Templates/TemplateEditor.tsx'
import {StorageProvider} from '@features/Storage/StorageProvider.tsx'
import {useLocation, useNavigationHistory} from './hooks/useNavigation.ts'
import {isMarkdownTemplate} from '@lib/navigation/navigation.ts'

/**
 * The app's contents inside the jotai store: wires location to browser history and renders either the markdown-template
 * editor surface or the library of binders, holding the shared storage orchestration above that switch so navigation
 * does not remount it.
 */
function AppContent() {
    useNavigationHistory()
    const location = useLocation()
    return (
        <StorageProvider>
            {isMarkdownTemplate(location) ? <TemplateEditor/> : <Library/>}
        </StorageProvider>
    )
}

export default AppContent
