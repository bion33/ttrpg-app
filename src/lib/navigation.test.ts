import {describe, expect, it} from 'vitest'
import {isLibrary, libraryLocation, sameLocation} from './navigation.ts'

describe('libraryLocation', () => {
    it('has no binder open and no page active', () => {
        expect(libraryLocation()).toEqual({binderId: '', pageId: ''})
    })
})

describe('isLibrary', () => {
    it('is true when no binder is open', () => {
        expect(isLibrary(libraryLocation())).toBe(true)
    })

    it('is false when a binder is open', () => {
        expect(isLibrary({binderId: 'a', pageId: ''})).toBe(false)
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
})
