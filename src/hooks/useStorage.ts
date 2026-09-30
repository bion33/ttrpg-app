import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import type {LibrarySnapshot} from '../lib/snapshot.ts'
import {applySnapshot, createSnapshot, snapshotHash} from '../lib/snapshot.ts'
import type {ProviderId} from '../lib/storage/StorageProvider.ts'
import {getProvider} from '../lib/storage/providers.ts'
import {evaluateSync, type SyncStatus} from '../lib/storage/sync.ts'
import {chooseRemoteRevision, isProbeable, resolveTarget, saveIntent} from '../lib/storage/syncActions.ts'
import type {SyncState} from '../lib/storage/connectionStore.ts'
import {
    clearNextcloudConnection,
    loadActiveProvider,
    loadNextcloudConnection,
    loadSyncState,
    saveActiveProvider,
    saveNextcloudConnection,
    saveSyncState,
} from '../lib/storage/connectionStore.ts'
import {adoptConnection, type NextcloudConnection} from '../lib/storage/nextcloudProvider.ts'
import {newId} from '../lib/newId.ts'

/**
 * The callback that swaps the app's jotai store so `atomWithStorage` atoms re-read the bulk-rewritten localStorage
 * after a load; provided by the app root and defaulting to a no-op outside it.
 */
export const StorageRemountContext = createContext<() => void>(() => {})

/** A pending conflict: the incoming snapshot, and whether it was raised while loading or while saving. */
export interface ConflictPrompt {
    incoming: LibrarySnapshot
    origin: 'load' | 'save'
}

/** A transient outcome of the last save/load, surfaced by the controls. */
export type StorageActivity = 'idle' | 'saving' | 'saved' | 'error'

/** The storage state and actions the controls consume. */
export interface UseStorage {
    status: SyncStatus
    dirty: boolean
    provider: ProviderId
    activity: StorageActivity
    error: string | null
    save(): Promise<void>
    load(): Promise<void>
    conflict: ConflictPrompt | null
    resolveConflict(choice: 'keepLocal' | 'takeOther'): Promise<void>
    setProvider(id: ProviderId): void
    nextcloudConnection: NextcloudConnection | null
    connectNextcloud(connection: NextcloudConnection): Promise<void>
    disconnectNextcloud(): Promise<void>
}

// App-view keys that hold no character data, so they do not by themselves make the library "have data".
const VIEW_ONLY_KEYS = new Set(['location', 'pageScale'])

// A never-synced sync base, used on mount and whenever a target change invalidates the previous lineage.
const UNSYNCED: SyncState = {baseRevision: null, baseHash: null}

// True when a snapshot holds any binder, page, or field data (an empty binder list and view keys do not count).
function libraryHasData(snapshot: LibrarySnapshot): boolean {
    return Object.entries(snapshot.entries).some(([key, value]) => {
        if (VIEW_ONLY_KEYS.has(key)) return false
        if (key === 'binders') return value.trim() !== '' && value.trim() !== '[]'
        return true
    })
}

// True when the error is the user dismissing a native file picker, which is a cancel, not a failure.
function isCancel(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError'
}

// The message to surface for a caught save/load error.
function messageFor(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback
}

/**
 * Orchestrates whole-library persistence for the controls: resolves the active provider's target, probes a cloud
 * remote's revision (with a stale guard), derives dirty/status, saves and loads through the provider, and drives the
 * conflict flow when a load diverges from edits or a save would clobber an ahead remote.
 */
export function useStorage(): UseStorage {
    const remount = useContext(StorageRemountContext)
    const [provider, setProviderState] = useState<ProviderId>('file')
    const [connection, setConnection] = useState<NextcloudConnection | null>(null)
    const [syncState, setSyncState] = useState<SyncState>(UNSYNCED)
    const [probedRevision, setProbedRevision] = useState<string | null>(null)
    const [conflict, setConflict] = useState<ConflictPrompt | null>(null)
    const [activity, setActivity] = useState<StorageActivity>('idle')
    const [error, setError] = useState<string | null>(null)
    const [dirty, setDirty] = useState(false)
    // Incremented on each probe so an out-of-order resolution can be discarded (never regress to a stale revision).
    const probeToken = useRef(0)

    const probeable = isProbeable(provider)
    const target = useMemo(() => resolveTarget(provider, connection), [provider, connection])

    // Load the persisted provider selection, sync base, and (for Nextcloud) the stored connection once on mount.
    useEffect(() => {
        let active = true
        void (async () => {
            const [storedProvider, storedSync] = await Promise.all([loadActiveProvider(), loadSyncState()])
            if (!active) return
            setSyncState(storedSync)
            if (!storedProvider) return
            setProviderState(storedProvider)
            if (storedProvider !== 'nextcloud') return
            const storedConnection = await loadNextcloudConnection()
            if (!active) return
            adoptConnection(storedConnection)
            setConnection(storedConnection)
        })()
        return () => {
            active = false
        }
    }, [])

    // Probes the current cloud target's remote revision; the file provider keeps the base as its stand-in remote, so a
    // stale probe on a non-probeable provider is never read (chooseRemoteRevision ignores it) and needs no clearing here.
    const refreshRemote = useCallback(async () => {
        if (!probeable || !target) return
        const token = ++probeToken.current
        try {
            const revision = await getProvider(provider).readRevision(target)
            if (probeToken.current === token) setProbedRevision(revision)
        } catch {
            if (probeToken.current === token) setProbedRevision(null)
        }
    }, [provider, probeable, target])

    // Re-derive dirty and re-probe the remote on mount, whenever the base or target changes, and on window focus (edits
    // or a remote save may have happened elsewhere). refreshRemote's identity tracks the target, so a target change
    // re-runs this and re-probes.
    useEffect(() => {
        const sync = () => {
            setDirty(deriveDirty(syncState))
            void refreshRemote()
        }
        sync()
        window.addEventListener('focus', sync)
        return () => window.removeEventListener('focus', sync)
    }, [syncState, refreshRemote])

    const remoteRevision = chooseRemoteRevision({probeable, probedRevision, baseRevision: syncState.baseRevision})
    const status = evaluateSync({remoteRevision, baseRevision: syncState.baseRevision, dirty})

    // Persists a sync base both to IndexedDB and to local state so the next decision starts from the new ancestor.
    const commitSyncState = useCallback(async (next: SyncState) => {
        await saveSyncState(next)
        setSyncState(next)
    }, [])

    // Applies a loaded snapshot to storage, records it as the new sync base, then swaps the store so atoms re-read.
    const applyLoaded = useCallback(async (snapshot: LibrarySnapshot) => {
        applySnapshot(localStorage, snapshot)
        const stored = createSnapshot(localStorage, snapshot.revision, snapshot.savedAt)
        await commitSyncState({baseRevision: snapshot.revision, baseHash: snapshotHash(stored)})
        setProbedRevision(snapshot.revision)
        remount()
    }, [commitSyncState, remount])

    // Writes the current library to the target and records the new revision as the sync base; assumes no conflict.
    const performSave = useCallback(async () => {
        if (!target) return
        setError(null)
        setActivity('saving')
        try {
            const revision = newId()
            const snapshot = createSnapshot(localStorage, revision, new Date().toISOString())
            await getProvider(provider).save(target, snapshot)
            await commitSyncState({baseRevision: revision, baseHash: snapshotHash(snapshot)})
            setProbedRevision(revision)
            setActivity('saved')
        } catch (caught) {
            if (isCancel(caught)) {
                setActivity('idle')
                return
            }
            setError(messageFor(caught, 'Save failed.'))
            setActivity('error')
        }
    }, [target, provider, commitSyncState])

    const save = useCallback(async () => {
        if (!target) return
        // A cloud remote that is ahead or diverged must be reconciled, not clobbered: surface the conflict instead.
        if (saveIntent(status, probeable) === 'conflict') {
            try {
                const incoming = await getProvider(provider).load(target)
                if (incoming) {
                    setConflict({incoming, origin: 'save'})
                    return
                }
            } catch (caught) {
                setError(messageFor(caught, 'Save failed.'))
                setActivity('error')
                return
            }
        }
        await performSave()
    }, [target, provider, status, probeable, performSave])

    const load = useCallback(async () => {
        if (!target) return
        setError(null)
        try {
            const snapshot = await getProvider(provider).load(target)
            if (!snapshot) return
            const decision = evaluateSync({
                remoteRevision: snapshot.revision,
                baseRevision: syncState.baseRevision,
                dirty: deriveDirty(syncState),
            })
            // A clean load replaces local state; a divergent (or older-over-newer) load asks the user first.
            if (decision === 'localAhead' || decision === 'diverged') {
                setConflict({incoming: snapshot, origin: 'load'})
                return
            }
            await applyLoaded(snapshot)
        } catch (caught) {
            if (isCancel(caught)) return
            setError(messageFor(caught, 'Load failed.'))
            setActivity('error')
        }
    }, [target, provider, syncState, applyLoaded])

    const resolveConflict = useCallback(async (choice: 'keepLocal' | 'takeOther') => {
        const pending = conflict
        setConflict(null)
        if (!pending) return
        if (choice === 'takeOther') {
            await applyLoaded(pending.incoming)
            return
        }
        // Keeping local during a save conflict still means writing this device's state over the remote.
        if (pending.origin === 'save') await performSave()
    }, [conflict, applyLoaded, performSave])

    const setProvider = useCallback((id: ProviderId) => {
        setProviderState((current) => {
            if (current === id) return current
            // A base from a different target is meaningless; reset lineage so the next load/save re-establishes it.
            void commitSyncState(UNSYNCED)
            void saveActiveProvider(id)
            setProbedRevision(null)
            return id
        })
    }, [commitSyncState])

    const connectNextcloud = useCallback(async (form: NextcloudConnection) => {
        adoptConnection(form)
        try {
            await getProvider('nextcloud').connect()
        } catch (caught) {
            adoptConnection(connection)
            throw caught
        }
        await saveNextcloudConnection(form)
        setConnection(form)
        setProviderState('nextcloud')
        await saveActiveProvider('nextcloud')
        await commitSyncState(UNSYNCED)
    }, [connection, commitSyncState])

    const disconnectNextcloud = useCallback(async () => {
        adoptConnection(null)
        await clearNextcloudConnection()
        setConnection(null)
        setProviderState('file')
        await saveActiveProvider('file')
        setProbedRevision(null)
        await commitSyncState(UNSYNCED)
    }, [commitSyncState])

    return {
        status, dirty, provider, activity, error, save, load, conflict, resolveConflict, setProvider,
        nextcloudConnection: connection, connectNextcloud, disconnectNextcloud,
    }
}

// Derives dirty from the sync base against current localStorage; a never-synced base is dirty only when data exists.
function deriveDirty(syncState: SyncState): boolean {
    const snapshot = createSnapshot(localStorage, '', '')
    if (syncState.baseHash === null) return libraryHasData(snapshot)
    return snapshotHash(snapshot) !== syncState.baseHash
}
