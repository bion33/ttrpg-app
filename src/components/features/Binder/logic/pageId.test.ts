import {describe, expect, it} from 'vitest'
import {slugify, uniqueId} from './pageId.ts'

describe('slugify', () => {
    it('lowercases and dashes separators', () => {
        expect(slugify('My Fighter')).toBe('my-fighter')
    })

    it('collapses runs of non-alphanumerics and trims edge dashes', () => {
        expect(slugify('  Barbarian!! (v2) ')).toBe('barbarian-v2')
    })

    it('drops non-latin characters', () => {
        expect(slugify('Café Ölaf')).toBe('caf-laf')
    })

    it('returns empty string when nothing survives', () => {
        expect(slugify('***')).toBe('')
    })
})

describe('uniqueId', () => {
    it('uses the plain slug when free', () => {
        expect(uniqueId('Wizard', ['fighter'])).toBe('wizard')
    })

    it('suffixes to avoid a collision', () => {
        expect(uniqueId('Wizard', ['wizard'])).toBe('wizard-2')
        expect(uniqueId('Wizard', ['wizard', 'wizard-2'])).toBe('wizard-3')
    })

    it('falls back to "page" for an empty slug', () => {
        expect(uniqueId('***', [])).toBe('page')
        expect(uniqueId('***', ['page'])).toBe('page-2')
    })
})
