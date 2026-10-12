import {dedupeSlugs, slugify} from '@lib/navigation/slug.ts'

// Matches an ATX heading line: one to six leading `#`, a space, then the heading text (trailing `#` run and spaces
// trimmed), ignoring indented/`>`-prefixed lines so only true top-level headings count.
const HEADING_LINE = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/

/**
 * The texts of a markdown document's ATX headings (`#`..`######`) in document order, for the in-app link modal's
 * heading picker. Each text is sluggified elsewhere to match the ids the editor assigns.
 */
export function extractHeadings(markdown: string): string[] {
    const headings: string[] = []
    for (const line of markdown.split('\n')) {
        const match = HEADING_LINE.exec(line)
        if (match) headings.push(match[1].trim())
    }
    return headings
}

/**
 * The heading-anchor slugs for a list of heading texts in document order: each slugified (falling back to `section`
 * when it yields nothing) and disambiguated, so the ids the editor assigns and the link modal's targets always agree.
 */
export function headingSlugs(texts: string[]): string[] {
    return dedupeSlugs(texts.map((text) => slugify(text) || 'section'))
}
