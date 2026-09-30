import {describe, expect, it} from 'vitest'
import type {SyncStatus} from './sync.ts'
import type {NextcloudConnection} from './nextcloudProvider.ts'
import {canLoad, canSave, chooseRemoteRevision, isProbeable, resolveTarget, saveIntent} from './syncActions.ts'

const ALL_STATUSES: SyncStatus[] = ['upToDate', 'localAhead', 'remoteAhead', 'diverged', 'noRemote', 'remoteMissing']

const connection: NextcloudConnection = {
    baseUrl: 'https://cloud.example.com',
    username: 'ada',
    appPassword: 'secret',
    path: 'dnd/library.json',
    label: 'cloud.example.com / dnd/library.json',
}

describe('isProbeable', () => {
    it('is false only for the file provider', () => {
        expect(isProbeable('file')).toBe(false)
        expect(isProbeable('nextcloud')).toBe(true)
        expect(isProbeable('onedrive')).toBe(true)
    })
})

describe('resolveTarget', () => {
    it('returns the file target regardless of connection', () => {
        expect(resolveTarget('file', null)).toEqual({provider: 'file', locator: '', label: 'File'})
    })

    it('builds a Nextcloud target from the connection', () => {
        expect(resolveTarget('nextcloud', connection)).toEqual({
            provider: 'nextcloud',
            locator: 'https://cloud.example.com/remote.php/dav/files/ada/dnd/library.json',
            label: 'cloud.example.com / dnd/library.json',
        })
    })

    it('returns null for a cloud provider that is not connected', () => {
        expect(resolveTarget('nextcloud', null)).toBeNull()
        expect(resolveTarget('onedrive', null)).toBeNull()
    })
})

describe('chooseRemoteRevision', () => {
    it('uses the probed revision for a probeable provider', () => {
        expect(chooseRemoteRevision({probeable: true, probedRevision: 'remote', baseRevision: 'base'})).toBe('remote')
    })

    it('falls back to the base for a non-probeable provider', () => {
        expect(chooseRemoteRevision({probeable: false, probedRevision: 'remote', baseRevision: 'base'})).toBe('base')
    })
})

describe('canSave / canLoad / saveIntent for the file provider', () => {
    it('always enables save and load and never conflicts', () => {
        for (const status of ALL_STATUSES) {
            expect(canSave(status, false)).toBe(true)
            expect(canLoad(status, false)).toBe(true)
            expect(saveIntent(status, false)).toBe('write')
        }
    })
})

describe('canSave for a probeable provider', () => {
    it.each(ALL_STATUSES)('gates %s on lineage', (status) => {
        const expected = status !== 'upToDate' && status !== 'remoteAhead'
        expect(canSave(status, true)).toBe(expected)
    })
})

describe('canLoad for a probeable provider', () => {
    it.each(ALL_STATUSES)('gates %s on lineage', (status) => {
        const expected = status === 'remoteAhead' || status === 'diverged'
        expect(canLoad(status, true)).toBe(expected)
    })
})

describe('saveIntent for a probeable provider', () => {
    it.each(ALL_STATUSES)('routes %s correctly', (status) => {
        const expected = status === 'remoteAhead' || status === 'diverged' ? 'conflict' : 'write'
        expect(saveIntent(status, true)).toBe(expected)
    })
})
