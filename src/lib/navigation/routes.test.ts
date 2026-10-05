import {describe, expect, it} from 'vitest'
import {pathForRoute, routeForPath} from './routes.ts'

describe('routeForPath', () => {
    it('resolves the privacy path', () => {
        expect(routeForPath('/privacy')).toBe('privacy')
    })

    it('resolves the terms path', () => {
        expect(routeForPath('/terms')).toBe('terms')
    })

    it('resolves the ginfo path', () => {
        expect(routeForPath('/ginfo')).toBe('ginfo')
    })

    it('ignores a trailing slash', () => {
        expect(routeForPath('/privacy/')).toBe('privacy')
    })

    it('falls back to the app surface for any other path', () => {
        expect(routeForPath('/')).toBe('app')
        expect(routeForPath('/privacy-policy')).toBe('app')
        expect(routeForPath('/anything/else')).toBe('app')
    })
})

describe('pathForRoute', () => {
    it('maps the app surface to the root path', () => {
        expect(pathForRoute('app')).toBe('/')
    })

    it('maps the privacy route to its path', () => {
        expect(pathForRoute('privacy')).toBe('/privacy')
    })

    it('maps the terms route to its path', () => {
        expect(pathForRoute('terms')).toBe('/terms')
    })

    it('maps the ginfo route to its path', () => {
        expect(pathForRoute('ginfo')).toBe('/ginfo')
    })

    it('round-trips every non-default route back to itself', () => {
        expect(routeForPath(pathForRoute('privacy'))).toBe('privacy')
        expect(routeForPath(pathForRoute('terms'))).toBe('terms')
        expect(routeForPath(pathForRoute('ginfo'))).toBe('ginfo')
    })
})
