import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {toast} from 'sonner'
import {useDebouncedCallback} from 'use-debounce'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import {applySnapshot, createSnapshot, snapshotHash} from '@lib/storage/snapshot.ts'
import type {ProviderId} from '@lib/storage/providers/StorageProvider.ts'
import {getProvider} from '@lib/storage/providers/providers.ts'
import {evaluateSync, type SyncStatus} from '@lib/storage/sync/sync.ts'
import {chooseRemoteRevision, isProbeable, resolveTarget, saveIntent} from '@lib/storage/sync/syncActions.ts'
import {subscribeToStorageWrites} from '@lib/storage/observableStorage.ts'
import type {SyncState} from '@lib/storage/connectionStore.ts'
import {
    clearGoogleDriveConnection,
    clearNextcloudConnection,
    clearOneDriveConnection,
    loadActiveProvider,
    loadAutosaveEnabled,
    loadGoogleDriveConnection,
    loadNextcloudConnection,
    loadOneDriveConnection,
    loadSyncState,
    saveActiveProvider,
    saveAutosaveEnabled,
    saveGoogleDriveConnection,
    saveNextcloudConnection,
    saveOneDriveConnection,
    saveSyncState,
} from '@lib/storage/connectionStore.ts'
import {adoptConnection as adoptNextcloud, type NextcloudConnection} from '@lib/storage/providers/nextcloudProvider.ts'
import {adoptConnection as adoptOneDrive, type OneDriveConnection} from '@lib/storage/providers/onedriveProvider.ts'
import {
    adoptConnection as adoptGoogleDrive,
    type GoogleDriveConnection
} from '@lib/storage/providers/googleDriveProvider.ts'
import {exchangeCode, runGoogleAuth, runMicrosoftAuth} from '@lib/storage/oauth/oauthClient.ts'
import {type CloudConnectionPorts, useCloudConnection} from './useCloudConnection.ts'
import {useAutosave} from './useAutosave.ts'
import {newId} from '@lib/ids/newId.ts'
import {errorMessage} from '@lib/errors/errorMessage.ts'

/**
 * The callback that swaps the app's jotai store so `atomWithStorage` atoms re-read the bulk-rewritten localStorage
 * after a load; provided by the app root and defaulting to a no-op outside it.
 */
export const StorageRemountContext = createContext<() => void>(() => {
})

/** A pending conflict: the incoming snapshot, and whether it was raised while loading or while saving. */
export interface ConflictPrompt {
    incoming: LibrarySnapshot
    origin: 'load' | 'save'
}

// How long to wait after the last persisted-atom write before recomputing dirty, so rapid edits (typing) hash once.
const DIRTY_DEBOUNCE_MS = 200

/** The storage state and actions the controls consume. */
export interface UseStorage {
    status: SyncStatus
    dirty: boolean
    provider: ProviderId
    conflict: ConflictPrompt | null
    nextcloudConnection: NextcloudConnection | null
    oneDriveConnection: OneDriveConnection | null
    googleDriveConnection: GoogleDriveConnection | null
    saving: boolean
    autosaveEnabled: boolean
    promptSettings: boolean

    save(): Promise<void>

    load(): Promise<void>

    resolveConflict(choice: 'keepLocal' | 'takeOther'): Promise<void>

    setProvider(id: ProviderId): void

    connectNextcloud(connection: NextcloudConnection): Promise<void>

    disconnectNextcloud(): Promise<void>

    connectOneDrive(): Promise<void>

    disconnectOneDrive(): Promise<void>

    connectGoogleDrive(): Promise<void>

    disconnectGoogleDrive(): Promise<void>

    setAutosaveEnabled(enabled: boolean): Promise<void>

    dismissSettingsPrompt(): void
}

// App-view keys that hold no character data, so they do not by themselves make the library "have data".
const VIEW_ONLY_KEYS = new Set(['location', 'pageWidthFraction'])

// A never-synced sync base, used on mount and whenever a target change invalidates the previous lineage.
const UNSYNCED: SyncState = {baseRevision: null, baseHash: null}

// The per-provider connection ports; module-level (stable) so the cloud-connection lifecycle callbacks stay stable.
const nextcloudPorts: CloudConnectionPorts<NextcloudConnection> = {
    providerId: 'nextcloud',
    adopt: adoptNextcloud,
    persist: saveNextcloudConnection,
    clear: clearNextcloudConnection,
    load: loadNextcloudConnection,
}
const onedrivePorts: CloudConnectionPorts<OneDriveConnection> = {
    providerId: 'onedrive',
    adopt: adoptOneDrive,
    persist: saveOneDriveConnection,
    clear: clearOneDriveConnection,
    load: loadOneDriveConnection,
}
const googleDrivePorts: CloudConnectionPorts<GoogleDriveConnection> = {
    providerId: 'googleDrive',
    adopt: adoptGoogleDrive,
    persist: saveGoogleDriveConnection,
    clear: clearGoogleDriveConnection,
    load: loadGoogleDriveConnection,
}

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

/**
 * Orchestrates whole-library persistence for the controls: resolves the active provider's target, probes a cloud
 * remote's revision (with a stale guard), derives dirty/status, saves and loads through the provider, and drives the
 * conflict flow when a load diverges from edits or a save would clobber an ahead remote.
 */
export function useStorage(): UseStorage {
    const remount = useContext(StorageRemountContext)
    const [provider, setProviderState] = useState<ProviderId>('file')
    const [syncState, setSyncState] = useState<SyncState>(UNSYNCED)
    const [probedRevision, setProbedRevision] = useState<string | null>(null)
    const [conflict, setConflict] = useState<ConflictPrompt | null>(null)
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const [autosaveEnabled, setAutosaveEnabledState] = useState(true)
    const [promptSettings, setPromptSettings] = useState(false)
    // Incremented on each probe so an out-of-order resolution can be discarded (never regress to a stale revision).
    const probeToken = useRef(0)
    // The in-flight manual-save guard, written only from callbacks, so a debounced autosave and a manual save can never
    // both write.
    const savingRef = useRef(false)
    // Holds the autosave engine's autoload trigger, set in an effect below, so the probe path (defined before the engine)
    // can fire autoload through a stable ref without the engine having to precede it.
    const maybeAutoloadRef = useRef<(revision: string | null, token: number) => void>(() => {
    })

    // Mirrors the saving flag into a ref alongside the state, so programmatic writes can guard re-entrancy synchronously.
    const setSavingFlag = useCallback((value: boolean) => {
        savingRef.current = value
        setSaving(value)
    }, [])

    // Persists a sync base both to IndexedDB and to local state so the next decision starts from the new ancestor.
    const commitSyncState = useCallback(async (next: SyncState) => {
        await saveSyncState(next)
        setSyncState(next)
    }, [])

    // The shared lifecycle actions every cloud connection drives: make its provider active, reset the base, clear probe.
    const cloudActions = useMemo(() => ({
        async activateProvider(id: ProviderId) {
            setProviderState(id)
            await saveActiveProvider(id)
        },
        resetSyncBase: () => commitSyncState(UNSYNCED),
        clearProbe: () => setProbedRevision(null),
    }), [commitSyncState])

    const nextcloud = useCloudConnection(nextcloudPorts, cloudActions)
    const onedrive = useCloudConnection(onedrivePorts, cloudActions)
    const googleDrive = useCloudConnection(googleDrivePorts, cloudActions)
    // Stable references to each cloud provider's mount hydration, so the mount effect lists them without re-running.
    const hydrateNextcloud = nextcloud.hydrate
    const hydrateOneDrive = onedrive.hydrate
    const hydrateGoogleDrive = googleDrive.hydrate

    const probeable = isProbeable(provider)
    const target = useMemo(
        () => resolveTarget(provider, {
            nextcloud: nextcloud.connection,
            oneDrive: onedrive.connection,
            googleDrive: googleDrive.connection,
        }),
        [provider, nextcloud.connection, onedrive.connection, googleDrive.connection],
    )

    // Load the persisted provider selection, sync base, and (for a cloud provider) the stored connection once on mount.
    useEffect(() => {
        let active = true
        void (async () => {
            const [storedProvider, storedSync, storedAutosave] = await Promise.all([
                loadActiveProvider(), loadSyncState(), loadAutosaveEnabled(),
            ])
            if (!active) return
            setSyncState(storedSync)
            setAutosaveEnabledState(storedAutosave)
            // A never-configured device is shown the storage settings once, so a first-time user is pointed at setup.
            if (!storedProvider) {
                setPromptSettings(true)
                return
            }
            setProviderState(storedProvider)
            if (storedProvider === 'nextcloud') await hydrateNextcloud()
            else if (storedProvider === 'onedrive') await hydrateOneDrive()
            else if (storedProvider === 'googleDrive') await hydrateGoogleDrive()
        })()
        return () => {
            active = false
        }
    }, [hydrateNextcloud, hydrateOneDrive, hydrateGoogleDrive])

    // Probes the current cloud target's remote revision; the file provider keeps the base as its stand-in remote, so a
    // stale probe on a non-probeable provider is never read (chooseRemoteRevision ignores it) and needs no clearing here.
    const refreshRemote = useCallback(async () => {
        if (!probeable || !target) return
        const token = ++probeToken.current
        try {
            const revision = await getProvider(provider).readRevision(target)
            if (probeToken.current !== token) return
            setProbedRevision(revision)
            // Hand the fresh probe to the autosave engine (through a stable ref), which decides whether to autoload.
            maybeAutoloadRef.current(revision, token)
        } catch {
            if (probeToken.current === token) setProbedRevision(null)
        }
    }, [provider, probeable, target])

    const recomputeDirty = useCallback(() => setDirty(deriveDirty(syncState)), [syncState])
    // Rapid edits (typing) each persist, so coalesce their dirty recompute — a full-storage hash — to one settled run.
    const recomputeDirtyDebounced = useDebouncedCallback(recomputeDirty, DIRTY_DEBOUNCE_MS)

    // Re-derive dirty and re-probe the remote on mount, whenever the base or target changes, and on window focus (edits
    // or a remote save may have happened elsewhere). refreshRemote's identity tracks the target, so a target change
    // re-runs this and re-probes.
    useEffect(() => {
        const sync = () => {
            recomputeDirty()
            void refreshRemote()
        }
        sync()
        window.addEventListener('focus', sync)
        // A local edit changes dirtiness but not the remote, so it only recomputes dirty (debounced, no re-probe).
        const unsubscribe = subscribeToStorageWrites(recomputeDirtyDebounced)
        return () => {
            window.removeEventListener('focus', sync)
            unsubscribe()
            recomputeDirtyDebounced.cancel()
        }
    }, [recomputeDirty, recomputeDirtyDebounced, refreshRemote])

    const remoteRevision = chooseRemoteRevision({probeable, probedRevision, baseRevision: syncState.baseRevision})
    const status = evaluateSync({remoteRevision, baseRevision: syncState.baseRevision, dirty})

    // Applies a loaded snapshot to storage, records it as the new sync base, then swaps the store so atoms re-read.
    const applyLoaded = useCallback(async (snapshot: LibrarySnapshot) => {
        applySnapshot(localStorage, snapshot)
        const stored = createSnapshot(localStorage, snapshot.revision, snapshot.savedAt)
        await commitSyncState({baseRevision: snapshot.revision, baseHash: snapshotHash(stored)})
        setProbedRevision(snapshot.revision)
        remount()
    }, [commitSyncState, remount])

    // Writes the current library to the target and records the new revision as the sync base; assumes no conflict.
    // Gates the Save button for the whole write (this is every write path, including the conflict resolution below), so
    // two overlapping saves cannot be issued — which could otherwise let an id-addressed cloud provider create a
    // duplicate file. A `silent` write (autosave) reports only failures, never the in-progress/success toasts.
    const performSave = useCallback(async (silent: boolean) => {
        // Guard re-entrancy in the ref so a debounced autosave and a manual save can never both write (which could let an
        // id-addressed cloud provider create a duplicate file).
        if (!target || savingRef.current) return
        setSavingFlag(true)
        const toastId = silent ? undefined : toast.loading('Saving…')
        try {
            const revision = newId()
            const snapshot = createSnapshot(localStorage, revision, new Date().toISOString())
            await getProvider(provider).save(target, snapshot)
            await commitSyncState({baseRevision: revision, baseHash: snapshotHash(snapshot)})
            setProbedRevision(revision)
            if (!silent) toast.success('Saved', {id: toastId})
        } catch (caught) {
            // Dismissing the native file picker is a cancel, not a failure.
            if (isCancel(caught)) {
                if (toastId !== undefined) toast.dismiss(toastId)
                return
            }
            toast.error(errorMessage(caught, 'Save failed.'), {id: toastId})
        } finally {
            setSavingFlag(false)
        }
    }, [target, provider, commitSyncState, setSavingFlag])

    // A `silent` save (autosave) suppresses the in-progress/success toasts; failures (including conflicts) still surface.
    const save = useCallback(async (silent = false) => {
        if (!target) return
        // A cloud remote that is ahead or diverged must be reconciled, not clobbered: surface the conflict instead. Gate
        // the button around the pre-write probe too, so a second save cannot be launched while this one decides.
        if (saveIntent(status, probeable) === 'conflict') {
            setSavingFlag(true)
            try {
                const incoming = await getProvider(provider).load(target)
                if (incoming) {
                    setConflict({incoming, origin: 'save'})
                    return
                }
            } catch (caught) {
                toast.error(errorMessage(caught, 'Save failed.'))
                return
            } finally {
                setSavingFlag(false)
            }
        }
        await performSave(silent)
    }, [target, provider, status, probeable, performSave, setSavingFlag])

    const load = useCallback(async () => {
        if (!target) return
        const toastId = toast.loading('Loading…')
        try {
            const snapshot = await getProvider(provider).load(target)
            // Nothing to load: dismiss the pending toast rather than report an outcome.
            if (!snapshot) {
                toast.dismiss(toastId)
                return
            }
            const decision = evaluateSync({
                remoteRevision: snapshot.revision,
                baseRevision: syncState.baseRevision,
                dirty: deriveDirty(syncState),
            })
            // A clean load replaces local state; a divergent (or older-over-newer) load asks the user first.
            if (decision === 'localAhead' || decision === 'diverged') {
                toast.dismiss(toastId)
                setConflict({incoming: snapshot, origin: 'load'})
                return
            }
            await applyLoaded(snapshot)
            toast.success('Loaded', {id: toastId})
        } catch (caught) {
            // Dismissing the native file picker is a cancel, not a failure.
            if (isCancel(caught)) {
                toast.dismiss(toastId)
                return
            }
            toast.error(errorMessage(caught, 'Load failed.'), {id: toastId})
        }
    }, [target, provider, syncState, applyLoaded])

    // The hands-off autosave/autoload engine: debounces edits into automatic saves, flushes before the page goes
    // inactive, and catches a cleanly-ahead remote up via maybeAutoload (called from the probe path through the ref).
    const {maybeAutoload} = useAutosave({
        status, probeable, dirty, target, conflict, autosaveEnabled, syncState, savingRef, probeToken, save, load,
        deriveDirty,
    })
    // Keep the probe path's autoload trigger current after each render, so it fires the latest decision/load.
    useEffect(() => {
        maybeAutoloadRef.current = maybeAutoload
    })

    const resolveConflict = useCallback(async (choice: 'keepLocal' | 'takeOther') => {
        const pending = conflict
        setConflict(null)
        if (!pending) return
        if (choice === 'takeOther') {
            await applyLoaded(pending.incoming)
            return
        }
        // Keeping local during a save conflict still means writing this device's state over the remote.
        if (pending.origin === 'save') await performSave(false)
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

    // Persists the autosave/autoload preference. Enabling saves a dirty library immediately (rather than waiting for the
    // next edit); autoload catches up on its own, since the preference change re-probes the remote through refreshRemote.
    const setAutosaveEnabled = useCallback(async (enabled: boolean) => {
        setAutosaveEnabledState(enabled)
        await saveAutosaveEnabled(enabled)
        if (enabled && dirty) await save()
    }, [dirty, save])

    // Dismisses the first-run settings prompt, so the auto-shown settings modal fires at most once per session.
    const dismissSettingsPrompt = useCallback(() => setPromptSettings(false), [])

    // Clears every cloud provider's stored connection except the one just connected, so only one cloud provider is ever
    // connected at a time and switching clouds leaves no stale connection behind.
    const resetOtherClouds = useCallback(async (keep: ProviderId) => {
        await Promise.all([
            keep === 'nextcloud' ? Promise.resolve() : nextcloud.reset(),
            keep === 'onedrive' ? Promise.resolve() : onedrive.reset(),
            keep === 'googleDrive' ? Promise.resolve() : googleDrive.reset(),
        ])
    }, [nextcloud, onedrive, googleDrive])

    // Connects Nextcloud, then clears the other cloud providers so it becomes the sole connected one.
    const connectNextcloud = useCallback(async (connection: NextcloudConnection) => {
        await nextcloud.connect(connection)
        await resetOtherClouds('nextcloud')
    }, [nextcloud, resetOtherClouds])

    // Runs the interactive Microsoft sign-in, exchanges the code for tokens, connects, then clears the other clouds.
    const connectOneDrive = useCallback(async () => {
        const {code, verifier} = await runMicrosoftAuth()
        const tokens = await exchangeCode('microsoft', code, verifier)
        if (!tokens.refresh_token) throw new Error('Microsoft did not return a refresh token.')
        await onedrive.connect({refreshToken: tokens.refresh_token, label: 'OneDrive'})
        await resetOtherClouds('onedrive')
    }, [onedrive, resetOtherClouds])

    // Runs the interactive Google sign-in, exchanges the code for tokens, connects, then clears the other clouds.
    const connectGoogleDrive = useCallback(async () => {
        const {code, verifier} = await runGoogleAuth()
        const tokens = await exchangeCode('google', code, verifier)
        if (!tokens.refresh_token) throw new Error('Google did not return a refresh token.')
        await googleDrive.connect({refreshToken: tokens.refresh_token, label: 'Google Drive'})
        await resetOtherClouds('googleDrive')
    }, [googleDrive, resetOtherClouds])

    return {
        status, dirty, provider, save, load, conflict, resolveConflict, setProvider, saving,
        autosaveEnabled, setAutosaveEnabled, promptSettings, dismissSettingsPrompt,
        nextcloudConnection: nextcloud.connection,
        connectNextcloud,
        disconnectNextcloud: nextcloud.disconnect,
        oneDriveConnection: onedrive.connection,
        connectOneDrive,
        disconnectOneDrive: onedrive.disconnect,
        googleDriveConnection: googleDrive.connection,
        connectGoogleDrive,
        disconnectGoogleDrive: googleDrive.disconnect,
    }
}

// Derives dirty from the sync base against current localStorage; a never-synced base is dirty only when data exists.
function deriveDirty(syncState: SyncState): boolean {
    const snapshot = createSnapshot(localStorage, '', '')
    if (syncState.baseHash === null) return libraryHasData(snapshot)
    return snapshotHash(snapshot) !== syncState.baseHash
}
