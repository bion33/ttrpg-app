import {describe, expect, it} from 'vitest'
import {isInternalHref, parseInternalHref} from './internalLink.ts'

describe('isInternalHref', () => {
    it('accepts route paths and heading anchors', () => {
        expect(isInternalHref('/binders/hero/notes')).toBe(true)
        expect(isInternalHref('#a-heading')).toBe(true)
    })

    it('rejects external http(s) URLs', () => {
        expect(isInternalHref('https://example.com')).toBe(false)
        expect(isInternalHref('http://example.com/#x')).toBe(false)
    })

    it('rejects other values', () => {
        expect(isInternalHref('mailto:a@b.c')).toBe(false)
        expect(isInternalHref('relative/path')).toBe(false)
    })
})

describe('parseInternalHref', () => {
    it('splits a path and heading on the first hash', () => {
        expect(parseInternalHref('/binders/hero/notes#intro')).toEqual({path: '/binders/hero/notes', heading: 'intro'})
    })

    it('reads a path with no heading', () => {
        expect(parseInternalHref('/binders/hero/notes')).toEqual({path: '/binders/hero/notes', heading: ''})
    })

    it('reads a heading-only href as an empty path', () => {
        expect(parseInternalHref('#intro')).toEqual({path: '', heading: 'intro'})
    })
})
