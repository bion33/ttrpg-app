import type {ReactNode} from 'react'
import {Library} from 'lucide-react'
import IconButton from '@ui/IconButton/IconButton'
import PaperPage from '@ui/PaperPage/PaperPage.tsx'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import {useNavigate} from 'react-router'
import {libraryPath} from '@lib/navigation/routePaths.ts'
import SurfaceLayout from '@ui/SurfaceLayout/SurfaceLayout.tsx'
import './InfoPage.css'

/**
 * The shared shell for a standalone legal/information page (privacy, terms): a centred A4 paper sheet titled by the
 * caller, with a sidebar button that returns to the library.
 */
function InfoPage({title, children}: {title: string; children: ReactNode}) {
    const navigate = useNavigate()
    return (
        <SurfaceLayout sidebar={
            <IconButton icon={<Library/>} label="Back to library" labelSide="right"
                        onClick={() => navigate(libraryPath())}/>
        }>
            <main className="info-page">
                <PaperPage width={A4_WIDTH_PX} className="info-page__sheet">
                    <h1>{title}</h1>
                    {children}
                </PaperPage>
            </main>
        </SurfaceLayout>
    )
}

export default InfoPage
