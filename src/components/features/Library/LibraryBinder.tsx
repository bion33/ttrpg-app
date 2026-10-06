import type {CSSProperties, MouseEvent} from 'react'
import {Pencil, Plus, Trash2} from 'lucide-react'
import './Library.css'
import '@features/Binder/tabs/Tabs.css'
import IconButton from '@ui/IconButton/IconButton'
import {useImageSource} from '@hooks/useImageSource.ts'
import {bookJitter} from './logic/bookJitter/bookJitter.ts'
import {binderSpineDark, binderSpineLight, tabColor} from '@lib/colors/hueColors.ts'

/**
 * Props for one library binder cover: its spine hue and label, an optional portrait image, the seed for its stable
 * paper mess, the decorative page tabs to show, the open handler, and (for real binders) the edit/delete actions.
 * `ghost` renders the faded add cover.
 */
interface LibraryBinderProps {
    hue: number
    label: string
    portrait?: string
    jitterSeed: string
    tabs?: { hue: number; label: string }[]
    onOpen: () => void
    onEdit?: () => void
    onDelete?: (event: MouseEvent) => void
    ghost?: boolean
}

/**
 * One binder cover on the library shelf: loose papers behind a hue-tinted cover with a portrait (the chosen image, or
 * the name's first letter), its page tabs, and hover actions; the `ghost` variant is the faded "Add binder" cover.
 */
function LibraryBinder({hue, label, portrait, jitterSeed, tabs, onOpen, onEdit, onDelete, ghost = false}: LibraryBinderProps) {
    const jitter = bookJitter(jitterSeed)
    // A loading local portrait falls back to the initial rather than a loader, so the shelf stays calm.
    const {src: portraitSource} = useImageSource(portrait ?? '')
    return (
        <div className={`library__binder${ghost ? ' library__binder--ghost' : ''}`}
             style={{'--spine-light': binderSpineLight(hue), '--spine-dark': binderSpineDark(hue)} as CSSProperties}>
            {/* Loose sheets peeking out behind the cover, each tilted and offset for a messy look. */}
            <div className="library__papers" aria-hidden="true">
                {jitter.papers.map((paper, index) => (
                    <span key={index} className="library__paper"
                          style={{
                              '--dx': `${paper.offsetX}rem`, '--dy': `${paper.offsetY}rem`,
                              '--rot': `${paper.rotation}deg`
                          } as CSSProperties}/>
                ))}
            </div>
            {/* Decorative, non-functional binder tabs: the real page-tab strip markup, scaled down. */}
            {tabs && tabs.length > 0 && (
                <div className="library__tabs" aria-hidden="true">
                    <div className="tabs">
                        {tabs.map((tab, index) => (
                            <div key={index} className="tabs__tab"
                                 style={{'--hue': tab.hue, '--tab-color': tabColor(tab.hue)} as CSSProperties}>
                                <span className="tabs__label">{tab.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <button type="button" className="library__cover" onClick={onOpen}>
                <span className="library__portrait" aria-hidden="true">
                    {ghost
                        ? <Plus/>
                        : portraitSource
                            ? <img className="library__portrait-image" src={portraitSource} alt=""/>
                            : label.trim().charAt(0).toUpperCase()}
                </span>
                <span className="library__cover-name">{label}</span>
            </button>
            {(onEdit || onDelete) && (
                <div className="library__binder-actions">
                    {onEdit && (
                        <IconButton icon={<Pencil/>} label="Edit binder" labelSide="right" onClick={onEdit}/>
                    )}
                    {onDelete && (
                        <IconButton icon={<Trash2/>} label="Delete binder" labelSide="right" variant="danger"
                                    onClick={onDelete}/>
                    )}
                </div>
            )}
        </div>
    )
}

export default LibraryBinder
