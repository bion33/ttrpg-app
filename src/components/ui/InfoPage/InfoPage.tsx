import type {ReactNode} from 'react'
import {Library} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'
import PaperPage from '@ui/PaperPage/PaperPage.tsx'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import {useNavigateRoute} from '@hooks/useRoute.ts'
import './InfoPage.css'

/**
 * The shared shell for a standalone legal/information page (privacy, terms): a centred A4 paper sheet titled by the
 * caller, with a button pinned top-left that returns to the library.
 */
function InfoPage({title, children}: {title: string; children: ReactNode}) {
    const navigateRoute = useNavigateRoute()
    return (
        <main className="info-page">
            <div className="corner-cluster no-print info-page__home">
                <IconButton icon={<Library/>} label="Back to library" labelSide="right"
                            onClick={() => navigateRoute('app')}/>
            </div>

            <PaperPage width={A4_WIDTH_PX} className="info-page__sheet">
                <h1>{title}</h1>
                {children}
            </PaperPage>
        </main>
    )
}

export default InfoPage
