import type {CSSProperties, ReactNode} from 'react'
import './PaperPage.css'

/**
 * Props for the paper page: the document content to lay out on the sheet, the sheet's on-screen width in CSS pixels
 * (the caller's own physical page width), and an optional modifier class to tweak the sheet's look.
 */
interface PaperPageProps {
    children: ReactNode
    width: number
    className?: string
}

/**
 * A blank, white, A4-proportioned page whose content reads like a document (left-aligned, with page margins), sized to
 * the width its caller passes so it is a fixed sheet footprint.
 */
function PaperPage({children, width, className}: PaperPageProps) {
    return (
        <div className={`paper-page${className ? ` ${className}` : ''}`} style={{width: `${width}px`} as CSSProperties}>
            {children}
        </div>
    )
}

export default PaperPage
