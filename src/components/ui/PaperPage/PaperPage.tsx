import type {ReactNode} from 'react'
import './PaperPage.css'

/**
 * Props for the paper page: the document content to lay out on the sheet.
 */
interface PaperPageProps {
    children: ReactNode
}

/**
 * A blank, white, A4-proportioned page whose content reads like a document (left-aligned, with page margins).
 */
function PaperPage({children}: PaperPageProps) {
    return <div className="paper-page">{children}</div>
}

export default PaperPage
