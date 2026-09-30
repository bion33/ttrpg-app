import {useCallback, useState} from 'react'
import type {ProviderId} from '../lib/storage/StorageProvider.ts'
import {getProvider} from '../lib/storage/providers.ts'

/**
 * The per-provider persistence and adoption ports a cloud connection is driven through: the provider id, the provider's
 * in-memory adopt (with an optional rotation callback), and the connection store's save/clear/load.
 */
export interface CloudConnectionPorts<Connection> {
    providerId: ProviderId
    adopt(connection: Connection | null, onChange?: (connection: Connection) => void): void
    persist(connection: Connection): Promise<void>
    clear(): Promise<void>
    load(): Promise<Connection | null>
}

/**
 * The shared `useStorage` actions a cloud connection's lifecycle drives: making its provider active, resetting the sync
 * base (a base from another target is meaningless), and clearing the remote probe.
 */
export interface CloudConnectionActions {
    activateProvider(id: ProviderId): Promise<void>
    resetSyncBase(): Promise<void>
    clearProbe(): void
}

/** A cloud connection's state and lifecycle, shared by every cloud provider so connect/disconnect exist once. */
export interface CloudConnection<Connection> {
    connection: Connection | null
    connect(connection: Connection): Promise<void>
    disconnect(): Promise<void>
    hydrate(): Promise<void>
}

/**
 * Owns the connect/disconnect/hydrate lifecycle shared by every cloud provider (Nextcloud, OneDrive, and later Google):
 * adopt → validate → persist → activate → reset base on connect, and the inverse on disconnect. The provider's own
 * `persist` port is passed as the adopt rotation callback, so a rotated refresh token is saved through the one persister.
 */
export function useCloudConnection<Connection>(
    ports: CloudConnectionPorts<Connection>,
    actions: CloudConnectionActions,
): CloudConnection<Connection> {
    const [connection, setConnection] = useState<Connection | null>(null)

    const connect = useCallback(async (next: Connection) => {
        const previous = connection
        ports.adopt(next, ports.persist)
        try {
            await getProvider(ports.providerId).connect()
        } catch (caught) {
            // Restore the previously adopted connection so a failed connect leaves the working one in place.
            ports.adopt(previous, ports.persist)
            throw caught
        }
        await ports.persist(next)
        setConnection(next)
        await actions.activateProvider(ports.providerId)
        await actions.resetSyncBase()
    }, [connection, ports, actions])

    const disconnect = useCallback(async () => {
        ports.adopt(null)
        await ports.clear()
        setConnection(null)
        await actions.activateProvider('file')
        actions.clearProbe()
        await actions.resetSyncBase()
    }, [ports, actions])

    const hydrate = useCallback(async () => {
        const stored = await ports.load()
        ports.adopt(stored, ports.persist)
        setConnection(stored)
    }, [ports])

    return {connection, connect, disconnect, hydrate}
}
