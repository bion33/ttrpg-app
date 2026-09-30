import {beforeEach, describe, expect, it, vi} from 'vitest'
import {get} from 'idb-keyval'
import {
    clearGoogleDriveConnection,
    clearNextcloudConnection,
    clearOneDriveConnection,
    loadGoogleDriveConnection,
    loadNextcloudConnection,
    loadOneDriveConnection,
    saveGoogleDriveConnection,
    saveNextcloudConnection,
    saveOneDriveConnection,
} from './connectionStore.ts'
import type {NextcloudConnection} from './providers/nextcloudProvider.ts'
import type {OneDriveConnection} from './providers/onedriveProvider.ts'
import type {GoogleDriveConnection} from './providers/googleDriveProvider.ts'

// Back idb-keyval with an in-memory map so the store is testable without a real IndexedDB.
vi.mock('idb-keyval', () => {
    const data = new Map<string, unknown>()
    return {
        createStore: () => 'store',
        get: async (key: string) => data.get(key),
        set: async (key: string, value: unknown) => {
            data.set(key, value)
        },
        del: async (key: string) => {
            data.delete(key)
        },
        __data: data,
    }
})

const connection: NextcloudConnection = {
    baseUrl: 'https://cloud.example.com',
    username: 'ada',
    appPassword: 'app-pass',
    path: 'personal/ttrpg-app.json',
    label: 'cloud.example.com > personal/ttrpg-app.json',
}

const oneDriveConnection: OneDriveConnection = {refreshToken: 'refresh-token', label: 'OneDrive'}

const googleDriveConnection: GoogleDriveConnection = {
    refreshToken: 'refresh-token', label: 'Google Drive', fileId: 'file-42',
}

beforeEach(async () => {
    await clearNextcloudConnection()
    await clearOneDriveConnection()
    await clearGoogleDriveConnection()
})

describe('Nextcloud connection store', () => {
    it('returns null when nothing is stored', async () => {
        expect(await loadNextcloudConnection()).toBeNull()
    })

    it('round-trips a saved connection', async () => {
        await saveNextcloudConnection(connection)
        expect(await loadNextcloudConnection()).toEqual(connection)
        expect(await get('nextcloudConnection', 'store' as never)).toEqual(connection)
    })

    it('clears a stored connection', async () => {
        await saveNextcloudConnection(connection)
        await clearNextcloudConnection()
        expect(await loadNextcloudConnection()).toBeNull()
    })
})

describe('OneDrive connection store', () => {
    it('returns null when nothing is stored', async () => {
        expect(await loadOneDriveConnection()).toBeNull()
    })

    it('round-trips a saved connection', async () => {
        await saveOneDriveConnection(oneDriveConnection)
        expect(await loadOneDriveConnection()).toEqual(oneDriveConnection)
        expect(await get('onedriveConnection', 'store' as never)).toEqual(oneDriveConnection)
    })

    it('clears a stored connection', async () => {
        await saveOneDriveConnection(oneDriveConnection)
        await clearOneDriveConnection()
        expect(await loadOneDriveConnection()).toBeNull()
    })
})

describe('Google Drive connection store', () => {
    it('returns null when nothing is stored', async () => {
        expect(await loadGoogleDriveConnection()).toBeNull()
    })

    it('round-trips a saved connection', async () => {
        await saveGoogleDriveConnection(googleDriveConnection)
        expect(await loadGoogleDriveConnection()).toEqual(googleDriveConnection)
        expect(await get('googleDriveConnection', 'store' as never)).toEqual(googleDriveConnection)
    })

    it('clears a stored connection', async () => {
        await saveGoogleDriveConnection(googleDriveConnection)
        await clearGoogleDriveConnection()
        expect(await loadGoogleDriveConnection()).toBeNull()
    })
})
