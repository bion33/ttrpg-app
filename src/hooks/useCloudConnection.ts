import {useCallback, useEffect, useRef, useState} from 'react'
import type {ProviderId} from '@lib/storage/providers/StorageProvider.ts'
import {getProvider} from '@lib/storage/providers/providers.ts'

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

    reset(): Promise<void>

    hydrate(): Promise<void>
}

/**
 * Owns the connect/disconnect/hydrate lifecycle shared by every cloud provider (Nextcloud, OneDrive, Google Drive):
 * adopt → validate → persist → activate → reset base on connect, and the inverse on disconnect. The provider's own
 * `persist` port is passed as the adopt rotation callback, so a rotated refresh token is saved through the one persister.
 * Overlapping connect/disconnect are guarded, and a disconnect resets local state even if clearing storage fails.
 */
export function useCloudConnection<Connection>(
    ports: CloudConnectionPorts<Connection>,
    actions: CloudConnectionActions,
): CloudConnection<Connection> {
    const [connection, setConnection] = useState<Connection | null>(null)
    // Guards against overlapping connect/disconnect, which would corrupt the provider's single adopted connection.
    const inFlight = useRef(false)
    // Guards state writes against a connection op that resolves after this hook has unmounted. Set on mount (not just at
    // the initial value) so a remount — e.g. StrictMode's mount/unmount/remount — restores it after the first cleanup.
    const mounted = useRef(true)
    useEffect(() => {
        mounted.current = true
        return () => {
            mounted.current = false
        }
    }, [])

    const connect = useCallback(async (next: Connection) => {
        if (inFlight.current) throw new Error('A storage connection change is already in progress.')
        inFlight.current = true
        const previous = connection
        ports.adopt(next, ports.persist)
        try {
            await getProvider(ports.providerId).connect()
            await ports.persist(next)
            if (mounted.current) setConnection(next)
            await actions.activateProvider(ports.providerId)
            await actions.resetSyncBase()
        } catch (caught) {
            // Restore the previously adopted connection so a failed connect leaves the working one in place.
            ports.adopt(previous, ports.persist)
            throw caught
        } finally {
            inFlight.current = false
        }
    }, [connection, ports, actions])

    const disconnect = useCallback(async () => {
        if (inFlight.current) return
        inFlight.current = true
        ports.adopt(null)
        try {
            await ports.clear()
        } finally {
            // Reset local/provider state even if clearing the stored connection failed, so a failure can't strand the
            // app on a half-disconnected cloud provider.
            if (mounted.current) setConnection(null)
            await actions.activateProvider('file')
            actions.clearProbe()
            await actions.resetSyncBase()
            inFlight.current = false
        }
    }, [ports, actions])

    // Clears this provider's stored connection and adopted state without touching the active provider, so another
    // provider can become the sole connected one. Unlike disconnect, it leaves the active provider and sync base alone.
    const reset = useCallback(async () => {
        if (inFlight.current) return
        inFlight.current = true
        ports.adopt(null)
        try {
            await ports.clear()
        } finally {
            if (mounted.current) setConnection(null)
            inFlight.current = false
        }
    }, [ports])

    const hydrate = useCallback(async () => {
        const stored = await ports.load()
        ports.adopt(stored, ports.persist)
        if (mounted.current) setConnection(stored)
    }, [ports])

    return {connection, connect, disconnect, reset, hydrate}
}
