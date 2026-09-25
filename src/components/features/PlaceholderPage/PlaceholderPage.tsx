import './PlaceholderPage.css'

/**
 * Props for a stub page: the page title shown while its real content is not yet built.
 */
interface PlaceholderPageProps {
    title: string
}

/**
 * Temporary stand-in page used to prototype navigation before the real page content exists.
 */
function PlaceholderPage({title}: PlaceholderPageProps) {
    return (
        <div className="placeholder-page">
            <h1>{title}</h1>
            <p>This page is coming soon.</p>
        </div>
    )
}

export default PlaceholderPage
