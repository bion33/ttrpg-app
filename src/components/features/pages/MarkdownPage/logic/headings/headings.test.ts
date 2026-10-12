import {describe, expect, it} from 'vitest'
import {extractHeadings, headingSlugs} from './headings.ts'

describe('extractHeadings', () => {
    it('collects ATX headings of every level in document order', () => {
        const markdown = '# One\n\nbody\n\n## Two\n\n###### Six'
        expect(extractHeadings(markdown)).toEqual(['One', 'Two', 'Six'])
    })

    it('trims a trailing hash run and surrounding spaces', () => {
        expect(extractHeadings('##  Spaced Heading  ##')).toEqual(['Spaced Heading'])
    })

    it('ignores non-heading lines, including a bare hash and seven hashes', () => {
        expect(extractHeadings('#notaheading\n####### too many\ntext # mid')).toEqual([])
    })

    it('returns nothing for content without headings', () => {
        expect(extractHeadings('just a paragraph')).toEqual([])
    })
})

describe('headingSlugs', () => {
    it('slugifies heading texts in order', () => {
        expect(headingSlugs(['Chapter One', 'The End'])).toEqual(['chapter-one', 'the-end'])
    })

    it('disambiguates repeated headings', () => {
        expect(headingSlugs(['Notes', 'Notes'])).toEqual(['notes', 'notes-2'])
    })

    it('falls back to section for headings that yield no slug', () => {
        expect(headingSlugs(['日本語', '日本語'])).toEqual(['section', 'section-2'])
    })
})
