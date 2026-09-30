import {beforeEach, describe, expect, it, vi} from 'vitest'

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

import {get} from 'idb-keyval'
import {
    clearNextcloudConnection,
    clearOneDriveConnection,
    loadNextcloudConnection,
    loadOneDriveConnection,
    saveNextcloudConnection,
    saveOneDriveConnection,
} from './connectionStore.ts'
import type {NextcloudConnection} from './nextcloudProvider.ts'
import type {OneDriveConnection} from './onedriveProvider.ts'

const connection: NextcloudConnection = {
    baseUrl: 'https://cloud.example.com',
    username: 'ada',
    appPassword: 'app-pass',
    path: 'personal/ttrpg-app.json',
    label: 'cloud.example.com > personal/ttrpg-app.json',
}

const oneDriveConnection: OneDriveConnection = {refreshToken: 'refresh-token', label: 'OneDrive'}

beforeEach(async () => {
    await clearNextcloudConnection()
    await clearOneDriveConnection()
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
