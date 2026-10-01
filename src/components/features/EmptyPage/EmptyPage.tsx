import PaperPage from '@ui/PaperPage/PaperPage'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'

/**
 * Props for the empty page: an optional title, shown in place of the default heading.
 */
interface EmptyPageProps {
    title?: string
}

/**
 * The page shown when the binder has no active page, and the stand-in for a page whose real content does not exist yet.
 */
function EmptyPage({title}: EmptyPageProps) {
    return (
        <PaperPage width={A4_WIDTH_PX}>
            <h1>{title ?? 'No pages yet'}</h1>
            <p>
                This binder is currently empty. To add a page, click the button in the bottom-right corner.
            </p>
        </PaperPage>
    )
}

export default EmptyPage
