import {describe, expect, it} from 'vitest'
import {dedupeSlugs, slugify, uniqueSlug} from './slug.ts'

describe('slugify', () => {
    it('lower-cases and hyphenates words', () => {
        expect(slugify('Character Sheet')).toBe('character-sheet')
    })

    it('collapses runs of non-alphanumerics into one dash and trims edges', () => {
        expect(slugify('  Hello --- World!!  ')).toBe('hello-world')
    })

    it('keeps digits', () => {
        expect(slugify('Page 2')).toBe('page-2')
    })

    it('returns empty when nothing usable remains', () => {
        expect(slugify('日本語')).toBe('')
        expect(slugify('   ')).toBe('')
    })
})

describe('dedupeSlugs', () => {
    it('leaves distinct slugs unchanged', () => {
        expect(dedupeSlugs(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('suffixes repeats in order', () => {
        expect(dedupeSlugs(['a', 'a', 'a'])).toEqual(['a', 'a-2', 'a-3'])
    })

    it('does not collide with an existing literal suffix', () => {
        expect(dedupeSlugs(['a', 'a-2', 'a'])).toEqual(['a', 'a-2', 'a-3'])
    })
})

describe('uniqueSlug', () => {
    it('slugifies a label when it does not collide', () => {
        expect(uniqueSlug('My Page', ['other'], 'page')).toBe('my-page')
    })

    it('disambiguates against existing siblings', () => {
        expect(uniqueSlug('My Page', ['my-page'], 'page')).toBe('my-page-2')
        expect(uniqueSlug('My Page', ['my-page', 'my-page-2'], 'page')).toBe('my-page-3')
    })

    it('falls back when the label yields no slug', () => {
        expect(uniqueSlug('', [], 'binder')).toBe('binder')
        expect(uniqueSlug('日本語', ['binder'], 'binder')).toBe('binder-2')
    })
})
