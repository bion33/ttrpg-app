import type {FormEvent} from 'react'
import {useState} from 'react'
import {useParams} from 'react-router'
import {useAtomValue} from 'jotai'
import {isHttpUrl} from '@lib/url/httpUrl.ts'
import {isInternalHref, parseInternalHref} from '@lib/navigation/internalLink.ts'
import {binderPath} from '@lib/navigation/routePaths.ts'
import {bindersAtom} from '@features/Library/libraryAtoms.ts'
import {pagePrefix, pagesAtom} from '@features/Binder/binderAtoms.ts'
import {markdownAtom} from '../markdownAtoms.ts'
import {extractHeadings, headingSlugs} from '../logic/headings/headings.ts'
import Modal from '@ui/Modal/Modal'
import type {LinkSelection} from './linkCommands.ts'

/**
 * Props for the link dialogue: the href and label it opens with (both empty for a new link), a report of the chosen
 * link, a request to drop the link, or a cancellation.
 */
interface LinkModalProps {
    initialUrl: string
    initialLabel: string
    onSubmit: (link: LinkSelection) => void
    onRemove: () => void
    onCancel: () => void
}

// The page/binder slugs an internal href `…/binders/<binder>/<page>` addresses, for pre-selecting the in-app pickers.
function parseBinderTarget(href: string): {binder: string; page: string; heading: string} {
    const {path, heading} = parseInternalHref(href)
    const segments = path.split('/').filter(Boolean)
    const isBinderPath = segments[0] === 'binders'
    return {binder: isBinderPath ? segments[1] ?? '' : '', page: isBinderPath ? segments[2] ?? '' : '', heading}
}

/**
 * Modal dialogue for adding or editing a hyperlink: a label and a target that is either a web URL or an in-app link
 * (a binder, page, and optional heading), with a remove action when it opens on an existing link.
 */
function LinkModal({initialUrl, initialLabel, onSubmit, onRemove, onCancel}: LinkModalProps) {
    const {binderSlug = '', pageSlug = ''} = useParams()
    const binders = useAtomValue(bindersAtom)
    const initialTarget = parseBinderTarget(initialUrl)
    const [mode, setMode] = useState<'web' | 'app'>(isInternalHref(initialUrl) ? 'app' : 'web')
    const [label, setLabel] = useState(initialLabel)
    const [url, setUrl] = useState(isInternalHref(initialUrl) ? '' : initialUrl)
    const [binder, setBinder] = useState(initialTarget.binder || binderSlug || binders[0]?.id || '')
    const pages = useAtomValue(pagesAtom(binder))
    const [page, setPage] = useState(initialTarget.page || pageSlug || '')
    const [heading, setHeading] = useState(initialTarget.heading)
    // The chosen page's headings paired with the anchor slugs the editor assigns, so a picked heading links exactly.
    const markdown = useAtomValue(markdownAtom(pagePrefix(binder, page)))
    const texts = extractHeadings(markdown)
    const slugs = headingSlugs(texts)

    // Builds the href from the active mode's fields: the web URL, or the in-app route path (a bare `#heading` when it
    // targets a heading on the page currently being edited).
    function buildHref(): string {
        if (mode === 'web') return url.trim()
        if (heading && binder === binderSlug && page === pageSlug) return `#${heading}`
        return binderPath(binder, page) + (heading ? `#${heading}` : '')
    }

    const valid = mode === 'web' ? isHttpUrl(url.trim()) : Boolean(binder && page)

    function submit(event: FormEvent) {
        event.preventDefault()
        if (valid) onSubmit({url: buildHref(), label})
    }

    return (
        <Modal title={initialUrl ? 'Edit link' : 'Add link'} onClose={onCancel}>
            <form className="modal__body" onSubmit={submit}>
                <label className="modal__field">
                    <span>Label:</span>
                    <input type="text" placeholder="Link text (leave empty to use link as-is)" value={label}
                           onChange={(event) => setLabel(event.target.value)}/>
                </label>

                <div className="modal__field" role="radiogroup" aria-label="Link target">
                    <span>Link to:</span>
                    <div className="modal__actions">
                        <button type="button" className={`modal__btn${mode === 'web' ? ' modal__btn--primary' : ''}`}
                                aria-pressed={mode === 'web'} onClick={() => setMode('web')}>Web URL
                        </button>
                        <button type="button" className={`modal__btn${mode === 'app' ? ' modal__btn--primary' : ''}`}
                                aria-pressed={mode === 'app'} onClick={() => setMode('app')}>In-app page
                        </button>
                    </div>
                </div>

                {mode === 'web' ? (
                    <label className="modal__field">
                        <span>Web address:</span>
                        <input type="url" placeholder="https://…" value={url} autoFocus
                               onChange={(event) => setUrl(event.target.value)}/>
                    </label>
                ) : (
                    <>
                        <label className="modal__field">
                            <span>Binder:</span>
                            <select value={binder} onChange={(event) => {
                                setBinder(event.target.value)
                                setPage('')
                                setHeading('')
                            }}>
                                <option value="" disabled>Choose a binder…</option>
                                {binders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                            </select>
                        </label>
                        <label className="modal__field">
                            <span>Page:</span>
                            <select value={page} disabled={!binder}
                                    onChange={(event) => {
                                        setPage(event.target.value)
                                        setHeading('')
                                    }}>
                                <option value="" disabled>Choose a page…</option>
                                {pages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                            </select>
                        </label>
                        <label className="modal__field">
                            <span>Heading (optional):</span>
                            <select value={heading} disabled={!page}
                                    onChange={(event) => setHeading(event.target.value)}>
                                <option value="">Top of page</option>
                                {texts.map((text, index) => (
                                    <option key={slugs[index]} value={slugs[index]}>{text}</option>
                                ))}
                            </select>
                        </label>
                    </>
                )}

                <div className="modal__actions">
                    {initialUrl && (
                        <button type="button" className="modal__btn" onClick={onRemove}>Remove link</button>
                    )}
                    <button type="button" className="modal__btn" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="modal__btn modal__btn--primary" disabled={!valid}>
                        {initialUrl ? 'Save' : 'Add'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

export default LinkModal
