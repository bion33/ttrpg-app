import {describe, expect, it} from 'vitest'
import {isHttpUrl} from './httpUrl.ts'

describe('isHttpUrl', () => {
    it('accepts http and https URLs', () => {
        expect(isHttpUrl('http://example.com/a.png')).toBe(true)
        expect(isHttpUrl('https://example.com/a.png')).toBe(true)
    })

    it('rejects other schemes', () => {
        expect(isHttpUrl('ftp://example.com/a.png')).toBe(false)
        expect(isHttpUrl('javascript:alert(1)')).toBe(false)
        expect(isHttpUrl('data:image/png;base64,AAAA')).toBe(false)
    })

    it('rejects malformed or relative values', () => {
        expect(isHttpUrl('')).toBe(false)
        expect(isHttpUrl('   ')).toBe(false)
        expect(isHttpUrl('example.com/a.png')).toBe(false)
        expect(isHttpUrl('/images/a.png')).toBe(false)
    })
})
