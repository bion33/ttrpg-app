import {describe, expect, it} from 'vitest'
import {binderPath, libraryPath, templatePath} from './routePaths.ts'

describe('routePaths', () => {
    it('builds the library path', () => {
        expect(libraryPath()).toBe('/')
    })

    it('builds a binder path with and without a page', () => {
        expect(binderPath('hero')).toBe('/binders/hero')
        expect(binderPath('hero', 'notes')).toBe('/binders/hero/notes')
    })

    it('builds a template path', () => {
        expect(templatePath('spell-list')).toBe('/templates/spell-list')
    })
})
