import {describe, expect, it} from 'vitest'
import {
    isLibrary,
    isMarkdownTemplate,
    libraryLocation,
    markdownTemplateLocation,
    sameLocation,
} from './navigation.ts'

describe('libraryLocation', () => {
    it('has no binder open and no page active', () => {
        expect(libraryLocation()).toEqual({binderId: '', pageId: ''})
    })
})

describe('markdownTemplateLocation', () => {
    it('carries the template id with no binder or page', () => {
        expect(markdownTemplateLocation('t1')).toEqual({binderId: '', pageId: '', markdownTemplateId: 't1'})
    })
})

describe('isLibrary', () => {
    it('is true when no binder is open', () => {
        expect(isLibrary(libraryLocation())).toBe(true)
    })

    it('is false when a binder is open', () => {
        expect(isLibrary({binderId: 'a', pageId: ''})).toBe(false)
    })

    it('is false when a markdown template is open', () => {
        expect(isLibrary(markdownTemplateLocation('t1'))).toBe(false)
    })
})

describe('isMarkdownTemplate', () => {
    it('is true when a markdown template is open', () => {
        expect(isMarkdownTemplate(markdownTemplateLocation('t1'))).toBe(true)
    })

    it('is false for the library shelf', () => {
        expect(isMarkdownTemplate(libraryLocation())).toBe(false)
    })
})

describe('sameLocation', () => {
    it('is true for matching binder and page', () => {
        expect(sameLocation({binderId: 'a', pageId: 'b'}, {binderId: 'a', pageId: 'b'})).toBe(true)
    })

    it('is false when the binder differs', () => {
        expect(sameLocation({binderId: 'a', pageId: 'b'}, {binderId: 'c', pageId: 'b'})).toBe(false)
    })

    it('is false when the page differs', () => {
        expect(sameLocation({binderId: 'a', pageId: 'b'}, {binderId: 'a', pageId: 'c'})).toBe(false)
    })

    it('is false when the markdown template differs', () => {
        expect(sameLocation(markdownTemplateLocation('t1'), markdownTemplateLocation('t2'))).toBe(false)
    })

    it('is true for matching markdown templates', () => {
        expect(sameLocation(markdownTemplateLocation('t1'), markdownTemplateLocation('t1'))).toBe(true)
    })
})
