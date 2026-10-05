import {describe, expect, it} from 'vitest'
import {collectImageRefs} from './collectImageRefs.ts'
import {serializeImageTextareaValue} from '@lib/fields/imageTextareaValue.ts'

describe('collectImageRefs', () => {
    it('collects a plain image field path', () => {
        const refs = collectImageRefs({'b1:p1:portrait': 'images/hero-a1.png'})
        expect([...refs]).toEqual(['images/hero-a1.png'])
    })

    it('ignores remote URLs and empty values', () => {
        const refs = collectImageRefs({a: 'https://example.com/x.png', b: '', c: 'plain text'})
        expect(refs.size).toBe(0)
    })

    it('collects the image inside an image-or-textarea value', () => {
        const value = serializeImageTextareaValue({text: 'notes', imageUrl: 'images/sketch-z9.jpg'})
        const refs = collectImageRefs({'b1:p1:bio': value})
        expect([...refs]).toEqual(['images/sketch-z9.jpg'])
    })

    it('collects markdown image targets from a notes body, skipping remote ones', () => {
        const body = '# Title\n\n![a](images/map-c3.png)\n\n![b](https://example.com/remote.png)'
        const refs = collectImageRefs({'b1:p2:markdown': body})
        expect([...refs]).toEqual(['images/map-c3.png'])
    })

    it('deduplicates a path referenced in several entries', () => {
        const refs = collectImageRefs({
            a: 'images/hero-a1.png',
            b: '![x](images/hero-a1.png)',
        })
        expect([...refs]).toEqual(['images/hero-a1.png'])
    })
})
