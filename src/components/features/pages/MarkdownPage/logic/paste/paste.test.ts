import {describe, expect, it} from 'vitest'
import {markdownPasteText} from './paste.ts'

describe('markdownPasteText', () => {
    it('returns the plain text when only text/plain is available', () => {
        expect(markdownPasteText(['text/plain'], '# Heading')).toBe('# Heading')
    })

    it('defers when a richer text/html payload is present', () => {
        expect(markdownPasteText(['text/plain', 'text/html'], '# Heading')).toBeNull()
    })

    it('defers on blank or whitespace-only text', () => {
        expect(markdownPasteText(['text/plain'], '')).toBeNull()
        expect(markdownPasteText(['text/plain'], '   \n ')).toBeNull()
    })

    it('defers when no text payload is available', () => {
        expect(markdownPasteText(['Files'], '')).toBeNull()
    })
})
