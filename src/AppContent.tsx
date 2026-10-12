import {Navigate, Route, Routes} from 'react-router'
import Library from './components/features/Library/Library.tsx'
import Binder from '@features/Binder/Binder.tsx'
import TemplateEditor from '@features/Templates/TemplateEditor.tsx'
import PrivacyPage from '@features/Privacy/PrivacyPage.tsx'
import TermsPage from '@features/Terms/TermsPage.tsx'
import GoogleInfoPage from '@features/GoogleInfo/GoogleInfoPage.tsx'
import {StorageProvider} from '@features/Storage/StorageProvider.tsx'
import {useVisualViewportInset} from './hooks/useVisualViewportInset.ts'

/**
 * The app's root: holds the shared storage orchestration above the route switch, so moving between surfaces never
 * remounts storage. A binder renders at both its slug and its slug+page routes (one element kept mounted across tab
 * switches); any unmatched path redirects to the library.
 */
function AppContent() {
    useVisualViewportInset()

    return (
        <StorageProvider>
            <Routes>
                <Route path="/" element={<Library/>}/>
                <Route path="/binders/:binderSlug" element={<Binder/>}/>
                <Route path="/binders/:binderSlug/:pageSlug" element={<Binder/>}/>
                <Route path="/templates/:templateSlug" element={<TemplateEditor/>}/>
                <Route path="/privacy" element={<PrivacyPage/>}/>
                <Route path="/terms" element={<TermsPage/>}/>
                <Route path="/ginfo" element={<GoogleInfoPage/>}/>
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
        </StorageProvider>
    )
}

export default AppContent
