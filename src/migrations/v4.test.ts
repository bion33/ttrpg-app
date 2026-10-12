import {describe, expect, it} from 'vitest'
import {v4} from './v4.ts'

// GUID-shaped ids the migration should convert (the exact value is irrelevant; only the 8-4-4-4-12 shape matters).
const BINDER_A = '11111111-1111-4111-8111-111111111111'
const BINDER_B = '22222222-2222-4222-8222-222222222222'
const PAGE_1 = '33333333-3333-4333-8333-333333333333'
const PAGE_2 = '44444444-4444-4444-8444-444444444444'
const TEMPLATE = '55555555-5555-4555-8555-555555555555'

describe('v4 migration', () => {
    it('targets version 4 and runs in both phases', () => {
        expect(v4.to).toBe(4)
        expect(v4.phase).toBe('both')
    })

    it('rewrites binder and page ids in keys and values', () => {
        const entries = {
            binders: JSON.stringify([{id: BINDER_A, label: 'My Hero', hue: 10}]),
            [`${BINDER_A}:pages`]: JSON.stringify([{id: PAGE_1, label: 'Notes', type: 'markdown', storagePrefix: PAGE_1, hue: 0}]),
            [`${BINDER_A}:activePage`]: PAGE_1,
            [`${BINDER_A}:portrait`]: 'images/hero-ab12.png',
            [`${BINDER_A}:${PAGE_1}:markdown`]: '# Hi',
            [`${BINDER_A}:${PAGE_1}.field.strength`]: '12',
        }
        const migrated = v4.migrate(entries)

        expect(JSON.parse(migrated['binders'])).toEqual([{id: 'my-hero', label: 'My Hero', hue: 10}])
        expect(JSON.parse(migrated['my-hero:pages'])).toEqual([
            {id: 'notes', label: 'Notes', type: 'markdown', storagePrefix: 'notes', hue: 0},
        ])
        expect(migrated['my-hero:activePage']).toBe('notes')
        expect(migrated['my-hero:portrait']).toBe('images/hero-ab12.png')
        expect(migrated['my-hero:notes:markdown']).toBe('# Hi')
        expect(migrated['my-hero:notes.field.strength']).toBe('12')
        // The old GUID keys are gone.
        expect(Object.keys(migrated).some((key) => key.includes(BINDER_A))).toBe(false)
    })

    it('scopes page slugs per binder, so the same tab name keeps the same slug in different binders', () => {
        const entries = {
            binders: JSON.stringify([{id: BINDER_A, label: 'Alpha'}, {id: BINDER_B, label: 'Beta'}]),
            [`${BINDER_A}:pages`]: JSON.stringify([{id: PAGE_1, label: 'Notes', storagePrefix: PAGE_1}]),
            [`${BINDER_B}:pages`]: JSON.stringify([{id: PAGE_2, label: 'Notes', storagePrefix: PAGE_2}]),
        }
        const migrated = v4.migrate(entries)
        expect(JSON.parse(migrated['alpha:pages'])[0].id).toBe('notes')
        expect(JSON.parse(migrated['beta:pages'])[0].id).toBe('notes')
    })

    it('disambiguates duplicate labels within a scope', () => {
        const entries = {
            binders: JSON.stringify([{id: BINDER_A, label: 'Hero'}, {id: BINDER_B, label: 'Hero'}]),
        }
        const migrated = v4.migrate(entries)
        expect(JSON.parse(migrated['binders']).map((binder: {id: string}) => binder.id)).toEqual(['hero', 'hero-2'])
    })

    it('falls back for labels that yield no slug', () => {
        const entries = {binders: JSON.stringify([{id: BINDER_A, label: '日本語'}])}
        expect(JSON.parse(v4.migrate(entries)['binders'])[0].id).toBe('binder')
    })

    it('rewrites markdown-template keys, ids, and binder-template references', () => {
        const entries = {
            markdownTemplates: JSON.stringify([{id: TEMPLATE, label: 'Spell List'}]),
            [`template:${TEMPLATE}:markdown`]: '# Spells',
            binderTemplates: JSON.stringify([{id: 'bt-guid', label: 'Caster', pages: [{id: 'p', label: 'Spells', type: 'markdown', hue: 0, markdownTemplateId: TEMPLATE}]}]),
        }
        const migrated = v4.migrate(entries)
        expect(JSON.parse(migrated['markdownTemplates'])[0].id).toBe('spell-list')
        expect(migrated['template:spell-list:markdown']).toBe('# Spells')
        expect(JSON.parse(migrated['binderTemplates'])[0].pages[0].markdownTemplateId).toBe('spell-list')
    })

    it('drops the orphaned location key', () => {
        const migrated = v4.migrate({location: '{}', pageWidthFraction: '0.5'})
        expect(migrated).toEqual({pageWidthFraction: '0.5'})
    })

    it('is a no-op on already-slugged data', () => {
        const entries = {
            binders: JSON.stringify([{id: 'my-hero', label: 'My Hero'}]),
            'my-hero:pages': JSON.stringify([{id: 'notes', label: 'Notes', storagePrefix: 'notes'}]),
            'my-hero:notes:markdown': '# Hi',
        }
        expect(v4.migrate(entries)).toEqual(entries)
    })
})
