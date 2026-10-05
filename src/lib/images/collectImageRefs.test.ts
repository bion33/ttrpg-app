import {describe, expect, it} from 'vitest'
import {collectImageRefs} from './collectImageRefs.ts'
import {serializeImageTextareaValue} from '@lib/fields/imageTextareaValue.ts'

// A snapshot entry is the JSON-encoded form localStorage stores (what createSnapshot reads back verbatim), so every
// value is wrapped as the storage layer wraps it before being handed to collectImageRefs.
function encode(value: string): string {
    return JSON.stringify(value)
}

describe('collectImageRefs', () => {
    it('collects a plain image field path', () => {
        const refs = collectImageRefs({'b1:p1:portrait': encode('images/hero-a1.png')})
        expect([...refs]).toEqual(['images/hero-a1.png'])
    })

    it('ignores remote URLs and empty values', () => {
        const refs = collectImageRefs({a: encode('https://example.com/x.png'), b: encode(''), c: encode('plain text')})
        expect(refs.size).toBe(0)
    })

    it('ignores a non-string entry such as the binders list', () => {
        const refs = collectImageRefs({binders: JSON.stringify([{id: 'b1', name: 'images/not-a-ref.png'}])})
        expect(refs.size).toBe(0)
    })

    it('collects the image inside an image-or-textarea value', () => {
        const value = serializeImageTextareaValue({text: 'notes', imageUrl: 'images/sketch-z9.jpg'})
        const refs = collectImageRefs({'b1:p1:bio': encode(value)})
        expect([...refs]).toEqual(['images/sketch-z9.jpg'])
    })

    it('collects markdown image targets from a notes body, skipping remote ones', () => {
        const body = '# Title\n\n![a](images/map-c3.png)\n\n![b](https://example.com/remote.png)'
        const refs = collectImageRefs({'b1:p2:markdown': encode(body)})
        expect([...refs]).toEqual(['images/map-c3.png'])
    })

    it('deduplicates a path referenced in several entries', () => {
        const refs = collectImageRefs({
            a: encode('images/hero-a1.png'),
            b: encode('![x](images/hero-a1.png)'),
        })
        expect([...refs]).toEqual(['images/hero-a1.png'])
    })
})
