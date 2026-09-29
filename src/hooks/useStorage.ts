import {createContext, useCallback, useContext, useEffect, useState} from 'react'
import type {LibrarySnapshot} from '../lib/snapshot.ts'
import {applySnapshot, createSnapshot, snapshotHash} from '../lib/snapshot.ts'
import type {ProviderId, StorageTarget} from '../lib/storage/StorageProvider.ts'
import {getProvider} from '../lib/storage/providers.ts'
import {evaluateSync, type SyncStatus} from '../lib/storage/sync.ts'
import type {SyncState} from '../lib/storage/connectionStore.ts'
import {loadActiveProvider, loadSyncState, saveActiveProvider, saveSyncState} from '../lib/storage/connectionStore.ts'
import {newId} from '../lib/newId.ts'

/**
 * The callback that swaps the app's jotai store so `atomWithStorage` atoms re-read the bulk-rewritten localStorage
 * after a load; provided by the app root and defaulting to a no-op outside it.
 */
export const StorageRemountContext = createContext<() => void>(() => {})

/** A pending conflict raised by a load: the incoming snapshot the user chooses to keep or discard. */
export interface ConflictPrompt {
    incoming: LibrarySnapshot
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
}

// App-view keys that hold no character data, so they do not by themselves make the library "have data".
const VIEW_ONLY_KEYS = new Set(['location', 'pageScale'])

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

// The phase-1 target: the file provider ignores it (the user picks a file each time).
const FILE_TARGET: StorageTarget = {provider: 'file', locator: '', label: 'File'}

/**
 * Orchestrates whole-library persistence for the controls: derives dirty/status from local state and the last synced
 * base, saves and loads through the active provider, and drives the conflict flow when a load diverges from edits.
 */
export function useStorage(): UseStorage {
    const remount = useContext(StorageRemountContext)
    const [provider, setProviderState] = useState<ProviderId>('file')
    const [syncState, setSyncState] = useState<SyncState>({baseRevision: null, baseHash: null})
    const [conflict, setConflict] = useState<ConflictPrompt | null>(null)
    const [activity, setActivity] = useState<StorageActivity>('idle')
    const [error, setError] = useState<string | null>(null)
    const [dirty, setDirty] = useState(false)

    // Load the persisted provider selection and sync base once on mount.
    useEffect(() => {
        let active = true
        Promise.all([loadActiveProvider(), loadSyncState()]).then(([storedProvider, storedSync]) => {
            if (!active) return
            if (storedProvider) setProviderState(storedProvider)
            setSyncState(storedSync)
        })
        return () => {
            active = false
        }
    }, [])

    // Re-derive dirty when the base changes and whenever the window regains focus (edits may have happened elsewhere).
    useEffect(() => {
        const recompute = () => setDirty(deriveDirty(syncState))
        recompute()
        window.addEventListener('focus', recompute)
        return () => window.removeEventListener('focus', recompute)
    }, [syncState])

    // The file provider cannot probe a remote, so the last synced base stands in as the last known remote revision.
    const status = evaluateSync({remoteRevision: syncState.baseRevision, baseRevision: syncState.baseRevision, dirty})

    // Applies a loaded snapshot to storage, records it as the new sync base, then swaps the store so atoms re-read.
    const applyLoaded = useCallback(async (snapshot: LibrarySnapshot) => {
        applySnapshot(localStorage, snapshot)
        const stored = createSnapshot(localStorage, snapshot.revision, snapshot.savedAt)
        await saveSyncState({baseRevision: snapshot.revision, baseHash: snapshotHash(stored)})
        remount()
    }, [remount])

    const save = useCallback(async () => {
        setError(null)
        setActivity('saving')
        try {
            const revision = newId()
            const snapshot = createSnapshot(localStorage, revision, new Date().toISOString())
            await getProvider(provider).save(FILE_TARGET, snapshot)
            const next: SyncState = {baseRevision: revision, baseHash: snapshotHash(snapshot)}
            await saveSyncState(next)
            setSyncState(next)
            setActivity('saved')
        } catch (caught) {
            if (isCancel(caught)) {
                setActivity('idle')
                return
            }
            setError(caught instanceof Error ? caught.message : 'Save failed.')
            setActivity('error')
        }
    }, [provider])

    const load = useCallback(async () => {
        setError(null)
        try {
            const snapshot = await getProvider(provider).load(FILE_TARGET)
            if (!snapshot) return
            const decision = evaluateSync({
                remoteRevision: snapshot.revision,
                baseRevision: syncState.baseRevision,
                dirty: deriveDirty(syncState),
            })
            // A clean load replaces local state; a divergent (or older-over-newer) load asks the user first.
            if (decision === 'localAhead' || decision === 'diverged') {
                setConflict({incoming: snapshot})
                return
            }
            await applyLoaded(snapshot)
        } catch (caught) {
            if (isCancel(caught)) return
            setError(caught instanceof Error ? caught.message : 'Load failed.')
            setActivity('error')
        }
    }, [provider, syncState, applyLoaded])

    const resolveConflict = useCallback(async (choice: 'keepLocal' | 'takeOther') => {
        const pending = conflict
        setConflict(null)
        // Keeping local needs no write on import (a save is only performed for a cloud overwrite).
        if (!pending || choice === 'keepLocal') return
        await applyLoaded(pending.incoming)
    }, [conflict, applyLoaded])

    const setProvider = useCallback((id: ProviderId) => {
        setProviderState(id)
        void saveActiveProvider(id)
    }, [])

    return {status, dirty, provider, activity, error, save, load, conflict, resolveConflict, setProvider}
}

// Derives dirty from the sync base against current localStorage; a never-synced base is dirty only when data exists.
function deriveDirty(syncState: SyncState): boolean {
    const snapshot = createSnapshot(localStorage, '', '')
    if (syncState.baseHash === null) return libraryHasData(snapshot)
    return snapshotHash(snapshot) !== syncState.baseHash
}
