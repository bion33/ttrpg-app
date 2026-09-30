import {describe, expect, it} from 'vitest'
import {authorizeUrl, base64UrlEncode, codeChallenge, createCodeVerifier} from './pkce.ts'

describe('base64UrlEncode', () => {
    it('produces URL-safe output with no +/= characters', () => {
        const encoded = base64UrlEncode(new Uint8Array([251, 255, 190, 0, 1, 2, 3, 4, 5]))
        expect(encoded).not.toMatch(/[+/=]/)
    })
})

describe('codeChallenge', () => {
    it('matches the RFC 7636 known-answer vector', async () => {
        const challenge = await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
        expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
    })
})

describe('createCodeVerifier', () => {
    it('differs across calls', () => {
        expect(createCodeVerifier()).not.toBe(createCodeVerifier())
    })
})

describe('authorizeUrl', () => {
    it('builds the Microsoft authorize URL with PKCE and query response mode', () => {
        const url = new URL(authorizeUrl({
            tenant: 'common',
            clientId: 'client-id',
            redirectUri: 'http://localhost:8080/oauth/microsoft/callback.html',
            scope: 'Files.ReadWrite.AppFolder offline_access openid',
            state: 'state-token',
            challenge: 'challenge-value',
        }))
        expect(url.origin + url.pathname).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
        expect(url.searchParams.get('client_id')).toBe('client-id')
        expect(url.searchParams.get('response_type')).toBe('code')
        expect(url.searchParams.get('code_challenge_method')).toBe('S256')
        expect(url.searchParams.get('code_challenge')).toBe('challenge-value')
        expect(url.searchParams.get('response_mode')).toBe('query')
        expect(url.searchParams.get('scope')).toBe('Files.ReadWrite.AppFolder offline_access openid')
        expect(url.searchParams.get('state')).toBe('state-token')
    })
})
