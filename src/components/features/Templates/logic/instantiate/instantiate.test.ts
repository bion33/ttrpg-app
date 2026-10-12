import {describe, expect, it} from 'vitest'
import {instantiateBinderTemplate} from './instantiate.ts'
import type {BinderTemplate} from '../../templateTypes.ts'

describe('instantiateBinderTemplate', () => {
    it('builds pages in order with slug ids doubling as storage prefix, preserving label/type/hue', () => {
        const template: BinderTemplate = {
            id: 'template', label: 'Adventurer', pages: [
                {id: 'a', label: 'Character Sheet', type: 'characterSheet', hue: 10},
                {id: 'b', label: 'Log', type: 'markdown', hue: 20},
            ],
        }

        const {pages} = instantiateBinderTemplate(template)

        expect(pages).toEqual([
            {id: 'character-sheet', label: 'Character Sheet', type: 'characterSheet', hue: 10, storagePrefix: 'character-sheet'},
            {id: 'log', label: 'Log', type: 'markdown', hue: 20, storagePrefix: 'log'},
        ])
    })

    it('disambiguates duplicate tab labels within the new binder', () => {
        const template: BinderTemplate = {
            id: 'template', label: 'Twins', pages: [
                {id: 'a', label: 'Notes', type: 'markdown', hue: 10},
                {id: 'b', label: 'Notes', type: 'markdown', hue: 20},
            ],
        }

        expect(instantiateBinderTemplate(template).pages.map((page) => page.id)).toEqual(['notes', 'notes-2'])
    })

    it('seeds only markdown tabs that reference a template, carrying the created page id', () => {
        const template: BinderTemplate = {
            id: 'template', label: 'Adventurer', pages: [
                {id: 'a', label: 'Sheet', type: 'characterSheet', hue: 10},
                {id: 'b', label: 'Spells', type: 'markdown', hue: 20, markdownTemplateId: 'spells-template'},
                {id: 'c', label: 'Blank notes', type: 'markdown', hue: 30},
            ],
        }

        const {seeds} = instantiateBinderTemplate(template)

        expect(seeds).toEqual([{pageId: 'spells', markdownTemplateId: 'spells-template'}])
    })

    it('yields empty pages and seeds for a template with no tabs', () => {
        const template: BinderTemplate = {id: 'template', label: 'Empty', pages: []}

        expect(instantiateBinderTemplate(template)).toEqual({pages: [], seeds: []})
    })
})
