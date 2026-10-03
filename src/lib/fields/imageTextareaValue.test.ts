import {describe, expect, it} from 'vitest'
import {parseImageTextareaValue, serializeImageTextareaValue} from './imageTextareaValue.ts'

describe('parseImageTextareaValue', () => {
    it('treats an empty string as empty text and no image', () => {
        expect(parseImageTextareaValue('')).toEqual({text: '', imageUrl: ''})
    })

    it('decodes a serialized value', () => {
        expect(parseImageTextareaValue('{"text":"hello","imageUrl":"http://x/y.png"}'))
            .toEqual({text: 'hello', imageUrl: 'http://x/y.png'})
    })

    it('fills missing halves with empty strings', () => {
        expect(parseImageTextareaValue('{"text":"only text"}')).toEqual({text: 'only text', imageUrl: ''})
        expect(parseImageTextareaValue('{"imageUrl":"http://x/y.png"}')).toEqual({text: '', imageUrl: 'http://x/y.png'})
    })

    it('tolerates a malformed value as empty', () => {
        expect(parseImageTextareaValue('not json')).toEqual({text: '', imageUrl: ''})
    })
})

describe('serializeImageTextareaValue', () => {
    it('round-trips through parse', () => {
        const value = {text: 'notes', imageUrl: 'http://x/y.png'}
        expect(parseImageTextareaValue(serializeImageTextareaValue(value))).toEqual(value)
    })
})
