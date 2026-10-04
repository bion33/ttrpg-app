import {describe, expect, it} from 'vitest'
import {parseShareUrl} from './nextcloudShare.ts'

describe('parseShareUrl', () => {
    it('parses a plain share link', () => {
        expect(parseShareUrl('https://cloud.example.com/s/kFy9Lek5sm928xP')).toEqual({
            origin: 'https://cloud.example.com',
            token: 'kFy9Lek5sm928xP',
        })
    })

    it('parses an index.php share link', () => {
        expect(parseShareUrl('https://cloud.example.com/index.php/s/kFy9Lek5sm928xP')).toEqual({
            origin: 'https://cloud.example.com',
            token: 'kFy9Lek5sm928xP',
        })
    })

    it('ignores a trailing slash, query, and hash', () => {
        expect(parseShareUrl('https://cloud.example.com/s/token123/?foo=bar#baz')).toEqual({
            origin: 'https://cloud.example.com',
            token: 'token123',
        })
    })

    it('preserves a non-default port in the origin', () => {
        expect(parseShareUrl('https://cloud.example.com:8443/s/token123')).toEqual({
            origin: 'https://cloud.example.com:8443',
            token: 'token123',
        })
    })

    it('trims surrounding whitespace', () => {
        expect(parseShareUrl('  https://cloud.example.com/s/token123  ')).toEqual({
            origin: 'https://cloud.example.com',
            token: 'token123',
        })
    })

    it('rejects a link with no share segment', () => {
        expect(() => parseShareUrl('https://cloud.example.com/apps/files')).toThrow('Not a valid Nextcloud share link.')
    })

    it('rejects a non-URL string', () => {
        expect(() => parseShareUrl('not a url')).toThrow('Not a valid Nextcloud share link.')
    })
})
