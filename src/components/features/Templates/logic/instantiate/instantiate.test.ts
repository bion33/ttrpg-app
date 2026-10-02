import {describe, expect, it} from 'vitest'
import {instantiateBinderTemplate} from './instantiate.ts'
import type {BinderTemplate} from '../../templateTypes.ts'

// A deterministic id factory: sequential ids so the output can be asserted exactly.
function sequentialIds(): () => string {
    let next = 0
    return () => `id-${next++}`
}

describe('instantiateBinderTemplate', () => {
    it('builds pages in order with fresh ids doubling as storage prefix, preserving label/type/hue', () => {
        const template: BinderTemplate = {
            id: 'template', label: 'Adventurer', pages: [
                {id: 'a', label: 'Sheet', type: 'characterSheet', hue: 10},
                {id: 'b', label: 'Log', type: 'markdown', hue: 20},
            ],
        }

        const {pages} = instantiateBinderTemplate(template, sequentialIds())

        expect(pages).toEqual([
            {id: 'id-0', label: 'Sheet', type: 'characterSheet', hue: 10, storagePrefix: 'id-0'},
            {id: 'id-1', label: 'Log', type: 'markdown', hue: 20, storagePrefix: 'id-1'},
        ])
    })

    it('seeds only markdown tabs that reference a template, carrying the created page id', () => {
        const template: BinderTemplate = {
            id: 'template', label: 'Adventurer', pages: [
                {id: 'a', label: 'Sheet', type: 'characterSheet', hue: 10},
                {id: 'b', label: 'Spells', type: 'markdown', hue: 20, markdownTemplateId: 'spells-template'},
                {id: 'c', label: 'Blank notes', type: 'markdown', hue: 30},
            ],
        }

        const {seeds} = instantiateBinderTemplate(template, sequentialIds())

        expect(seeds).toEqual([{pageId: 'id-1', markdownTemplateId: 'spells-template'}])
    })

    it('yields empty pages and seeds for a template with no tabs', () => {
        const template: BinderTemplate = {id: 'template', label: 'Empty', pages: []}

        expect(instantiateBinderTemplate(template, sequentialIds())).toEqual({pages: [], seeds: []})
    })
})
