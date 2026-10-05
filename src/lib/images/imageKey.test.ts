import {describe, expect, it} from 'vitest'
import {buildImagePath, imageExtension, isLocalImage, isRemoteUrl} from './imageKey.ts'

describe('isRemoteUrl', () => {
    it('is true for http(s) addresses', () => {
        expect(isRemoteUrl('http://example.com/a.png')).toBe(true)
        expect(isRemoteUrl('https://example.com/a.png')).toBe(true)
    })

    it('is false for relative paths and empties', () => {
        expect(isRemoteUrl('images/a-b1.png')).toBe(false)
        expect(isRemoteUrl('')).toBe(false)
    })
})

describe('isLocalImage', () => {
    it('is true only for a non-empty non-remote value', () => {
        expect(isLocalImage('images/a-b1.png')).toBe(true)
        expect(isLocalImage('')).toBe(false)
        expect(isLocalImage('https://example.com/a.png')).toBe(false)
    })
})

describe('imageExtension', () => {
    it('returns the lower-cased extension without the dot', () => {
        expect(imageExtension('Portrait.PNG')).toBe('png')
        expect(imageExtension('a.b.jpeg')).toBe('jpeg')
    })

    it('returns empty when there is no usable extension', () => {
        expect(imageExtension('portrait')).toBe('')
        expect(imageExtension('trailing.')).toBe('')
    })
})

describe('buildImagePath', () => {
    it('slugs the base name and appends the suffix and extension', () => {
        expect(buildImagePath('Goblin Portrait.png', 'a1b2')).toBe('images/goblin-portrait-a1b2.png')
    })

    it('collapses punctuation runs and trims edge dashes', () => {
        expect(buildImagePath('  My__Hero!!.JPG ', 'x9')).toBe('images/my-hero-x9.jpg')
    })

    it('falls back to a base of "image" when the name slugs to nothing', () => {
        expect(buildImagePath('!!!.png', 'zz')).toBe('images/image-zz.png')
    })

    it('omits the extension when the name has none', () => {
        expect(buildImagePath('portrait', 'q7')).toBe('images/portrait-q7')
    })
})
