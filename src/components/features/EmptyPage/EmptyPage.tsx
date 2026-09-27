import PaperPage from '../../ui/PaperPage/PaperPage'

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
        <PaperPage>
            <h1>{title ?? 'No page yet'}</h1>
            <p>
                Click the <strong>+</strong> tab on the right edge of the binder to add a page. You'll be asked for
                a name and a type (such as a character sheet), and the new page opens straight away.
            </p>
        </PaperPage>
    )
}

export default EmptyPage
