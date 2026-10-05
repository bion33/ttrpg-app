import Library from './components/features/Library/Library.tsx'
import TemplateEditor from '@features/Templates/TemplateEditor.tsx'
import PrivacyPage from '@features/Privacy/PrivacyPage.tsx'
import TermsPage from '@features/Terms/TermsPage.tsx'
import GoogleInfoPage from '@features/GoogleInfo/GoogleInfoPage.tsx'
import {StorageProvider} from '@features/Storage/StorageProvider.tsx'
import {useLocation, useNavigationHistory} from './hooks/useNavigation.ts'
import {useRoute} from './hooks/useRoute.ts'
import {isMarkdownTemplate} from '@lib/navigation/navigation.ts'

/**
 * The app's root: wires the in-app location to browser history and holds the shared storage orchestration above the
 * route switch, so moving between the privacy page and the binder/page surface never remounts storage or navigation.
 */
function AppContent() {
    useNavigationHistory()

    return (
        <StorageProvider>
            <RoutedSurface/>
        </StorageProvider>
    )
}

/**
 * The top-level route switch: the standalone legal pages at their routes, and the main binder/page surface
 * (the markdown-template editor or the library of binders) otherwise.
 */
function RoutedSurface() {
    const route = useRoute()
    const location = useLocation()

    switch (route) {
        case "privacy":
            return <PrivacyPage/>
        case "terms":
            return <TermsPage/>
        case "ginfo":
            return <GoogleInfoPage/>
        default:
            return isMarkdownTemplate(location)
                ? <TemplateEditor/>
                : <Library/>
    }
}

export default AppContent
