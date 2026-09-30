import {describe, expect, it} from 'vitest'
import type {SyncStatus} from './sync.ts'
import type {NextcloudConnection} from './nextcloudProvider.ts'
import type {OneDriveConnection} from './onedriveProvider.ts'
import type {GoogleDriveConnection} from './googleDriveProvider.ts'
import type {CloudConnections} from './syncActions.ts'
import {
    autoloadIntent,
    autosaveIntent,
    canLoad,
    canSave,
    chooseRemoteRevision,
    isProbeable,
    resolveTarget,
    saveIntent,
} from './syncActions.ts'

const ALL_STATUSES: SyncStatus[] = ['upToDate', 'localAhead', 'remoteAhead', 'diverged', 'noRemote', 'remoteMissing']

const connection: NextcloudConnection = {
    baseUrl: 'https://cloud.example.com',
    username: 'ada',
    appPassword: 'secret',
    path: 'personal/ttrpg-app.json',
    label: 'cloud.example.com > personal/ttrpg-app.json',
}

const oneDriveConnection: OneDriveConnection = {refreshToken: 'refresh-token', label: 'OneDrive'}

const googleDriveConnection: GoogleDriveConnection = {refreshToken: 'refresh-token', label: 'Google Drive'}

const NO_CONNECTIONS: CloudConnections = {nextcloud: null, oneDrive: null, googleDrive: null}

describe('isProbeable', () => {
    it('is false only for the file provider', () => {
        expect(isProbeable('file')).toBe(false)
        expect(isProbeable('nextcloud')).toBe(true)
        expect(isProbeable('onedrive')).toBe(true)
        expect(isProbeable('googleDrive')).toBe(true)
    })
})

describe('resolveTarget', () => {
    it('returns the file target regardless of connections', () => {
        expect(resolveTarget('file', NO_CONNECTIONS)).toEqual({provider: 'file', locator: '', label: 'File'})
    })

    it('builds a Nextcloud target from the connection', () => {
        expect(resolveTarget('nextcloud', {...NO_CONNECTIONS, nextcloud: connection})).toEqual({
            provider: 'nextcloud',
            locator: 'https://cloud.example.com/remote.php/dav/files/ada/personal/ttrpg-app.json',
            label: 'cloud.example.com > personal/ttrpg-app.json',
        })
    })

    it('builds a OneDrive target with the fixed locator from the connection', () => {
        expect(resolveTarget('onedrive', {...NO_CONNECTIONS, oneDrive: oneDriveConnection})).toEqual({
            provider: 'onedrive',
            locator: 'ttrpg-app.json',
            label: 'OneDrive',
        })
    })

    it('builds a Google Drive target with the fixed locator from the connection', () => {
        expect(resolveTarget('googleDrive', {...NO_CONNECTIONS, googleDrive: googleDriveConnection})).toEqual({
            provider: 'googleDrive',
            locator: 'ttrpg-app.json',
            label: 'Google Drive',
        })
    })

    it('returns null for a cloud provider that is not connected', () => {
        expect(resolveTarget('nextcloud', NO_CONNECTIONS)).toBeNull()
        expect(resolveTarget('onedrive', NO_CONNECTIONS)).toBeNull()
        expect(resolveTarget('googleDrive', NO_CONNECTIONS)).toBeNull()
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
        for (const dirty of [true, false]) expect(canSave(dirty, false)).toBe(true)
        for (const status of ALL_STATUSES) {
            expect(canLoad(status, false)).toBe(true)
            expect(saveIntent(status, false)).toBe('write')
        }
    })
})

describe('canSave for a probeable provider', () => {
    it.each([true, false])('gates on local dirtiness (%s), not the remote', (dirty) => {
        expect(canSave(dirty, true)).toBe(dirty)
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

describe('autosaveIntent', () => {
    it('is idle when disabled, regardless of status', () => {
        for (const status of ALL_STATUSES) {
            expect(autosaveIntent({status, probeable: true, enabled: false, dirty: true})).toBe('idle')
        }
    })

    it('is idle for a non-probeable provider (the file provider)', () => {
        for (const status of ALL_STATUSES) {
            expect(autosaveIntent({status, probeable: false, enabled: true, dirty: true})).toBe('idle')
        }
    })

    it('is idle when the library is not dirty', () => {
        for (const status of ALL_STATUSES) {
            expect(autosaveIntent({status, probeable: true, enabled: true, dirty: false})).toBe('idle')
        }
    })

    it.each(ALL_STATUSES)('routes %s when enabled, probeable, and dirty', (status) => {
        const expected = status === 'diverged'
            ? 'conflict'
            : status === 'localAhead' || status === 'noRemote' || status === 'remoteMissing'
                ? 'write'
                : 'idle'
        expect(autosaveIntent({status, probeable: true, enabled: true, dirty: true})).toBe(expected)
    })
})

describe('autoloadIntent', () => {
    it('is idle when disabled, regardless of status', () => {
        for (const status of ALL_STATUSES) {
            expect(autoloadIntent({status, probeable: true, enabled: false})).toBe('idle')
        }
    })

    it('is idle for a non-probeable provider (the file provider)', () => {
        for (const status of ALL_STATUSES) {
            expect(autoloadIntent({status, probeable: false, enabled: true})).toBe('idle')
        }
    })

    it.each(ALL_STATUSES)('routes %s when enabled and probeable', (status) => {
        const expected = status === 'remoteAhead' ? 'load' : status === 'diverged' ? 'conflict' : 'idle'
        expect(autoloadIntent({status, probeable: true, enabled: true})).toBe(expected)
    })
})
