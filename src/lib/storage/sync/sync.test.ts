import {describe, expect, it} from 'vitest'
import {evaluateSync} from './sync.ts'

describe('evaluateSync', () => {
    // Every row of the plan's conflict truth table.
    it('no remote, never synced, clean → noRemote', () => {
        expect(evaluateSync({remoteRevision: null, baseRevision: null, dirty: false})).toBe('noRemote')
    })

    it('no remote, never synced, dirty → noRemote', () => {
        expect(evaluateSync({remoteRevision: null, baseRevision: null, dirty: true})).toBe('noRemote')
    })

    it('no remote, had a base, clean → remoteMissing', () => {
        expect(evaluateSync({remoteRevision: null, baseRevision: 'base', dirty: false})).toBe('remoteMissing')
    })

    it('no remote, had a base, dirty → remoteMissing', () => {
        expect(evaluateSync({remoteRevision: null, baseRevision: 'base', dirty: true})).toBe('remoteMissing')
    })

    it('remote set, never synced, clean → remoteAhead', () => {
        expect(evaluateSync({remoteRevision: 'r', baseRevision: null, dirty: false})).toBe('remoteAhead')
    })

    it('remote set, never synced, dirty → diverged', () => {
        expect(evaluateSync({remoteRevision: 'r', baseRevision: null, dirty: true})).toBe('diverged')
    })

    it('remote equals base, clean → upToDate', () => {
        expect(evaluateSync({remoteRevision: 'base', baseRevision: 'base', dirty: false})).toBe('upToDate')
    })

    it('remote equals base, dirty → localAhead', () => {
        expect(evaluateSync({remoteRevision: 'base', baseRevision: 'base', dirty: true})).toBe('localAhead')
    })

    it('remote differs from base, clean → remoteAhead', () => {
        expect(evaluateSync({remoteRevision: 'other', baseRevision: 'base', dirty: false})).toBe('remoteAhead')
    })

    it('remote differs from base, dirty → diverged', () => {
        expect(evaluateSync({remoteRevision: 'other', baseRevision: 'base', dirty: true})).toBe('diverged')
    })

    // After resolving a divergence, the new base equals the remote and local is clean, so both land at upToDate.
    it('keep-local resolution lands at upToDate', () => {
        expect(evaluateSync({remoteRevision: 'new', baseRevision: 'new', dirty: false})).toBe('upToDate')
    })

    it('take-other resolution lands at upToDate', () => {
        expect(evaluateSync({remoteRevision: 'remote', baseRevision: 'remote', dirty: false})).toBe('upToDate')
    })
})
