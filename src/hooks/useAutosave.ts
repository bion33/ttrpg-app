import type {MutableRefObject} from 'react'
import {useCallback, useEffect, useRef} from 'react'
import {useDebouncedCallback} from 'use-debounce'
import type {StorageTarget} from '@lib/storage/providers/StorageProvider.ts'
import type {SyncState} from '@lib/storage/connectionStore.ts'
import {evaluateSync, type SyncStatus} from '@lib/storage/sync/sync.ts'
import {autoloadIntent, autosaveIntent, chooseRemoteRevision} from '@lib/storage/sync/syncActions.ts'
import {subscribeToDataWrites} from '@lib/storage/observableStorage.ts'
import {useAutosaveFlush} from './useAutosaveFlush.ts'
import type {ConflictPrompt} from './useStorage.ts'

// How long edits must settle before an automatic save fires; longer than the dirty recompute so typing writes once.
const AUTOSAVE_DEBOUNCE_MS = 2000

/** The `useStorage` state and actions the autosave/autoload engine drives. */
export interface AutosavePorts {
    status: SyncStatus
    probeable: boolean
    dirty: boolean
    target: StorageTarget | null
    conflict: ConflictPrompt | null
    autosaveEnabled: boolean
    syncState: SyncState
    // The in-flight manual-save guard, shared so an autosave and a manual save can never both write.
    savingRef: MutableRefObject<boolean>
    // The probe token, so an autoload decided from one probe is discarded if a newer probe started meanwhile.
    probeToken: MutableRefObject<number>

    save(silent?: boolean): Promise<void>

    load(): Promise<void>

    deriveDirty(syncState: SyncState): boolean
}

/** The autosave engine's one output: the autoload trigger the remote-probe path calls with each fresh revision. */
export interface Autosave {
    maybeAutoload(revision: string | null, token: number): void
}

/**
 * Owns the hands-off autosave/autoload engine for a cloud provider: debounces persisted-atom writes into one automatic
 * save (routing a conflict to the modal, never a silent overwrite), flushes that pending save before the page goes
 * inactive, and — from a fresh remote probe — catches this device up when the remote is cleanly ahead. All decisions go
 * through the pure sync-action intents, so it never fires while disabled, mid-save, or during an open conflict.
 */
export function useAutosave(ports: AutosavePorts): Autosave {
    const {
        status, probeable, dirty, target, conflict, autosaveEnabled, syncState, savingRef, probeToken, save, load,
        deriveDirty,
    } = ports
    // Guards overlapping probes so they launch only one catch-up load.
    const autoloadInFlight = useRef(false)
    // Holds the latest load(), updated in an effect below, so autoload invokes the current load from a stable callback.
    const loadRef = useRef<() => Promise<void>>(async () => {
    })
    useEffect(() => {
        loadRef.current = load
    })

    // When autoload is enabled and a fresh probe shows the remote cleanly ahead (or diverged), catches this device up by
    // routing through load() — which cleanly applies a remoteAhead remote and raises the conflict modal on a diverged
    // one, never discarding local edits. Best-effort: a probe failure simply skips it, and the manual Load stays.
    const maybeAutoload = useCallback((revision: string | null, token: number) => {
        if (!target || autoloadInFlight.current || conflict) return
        const {baseRevision} = syncState
        const remoteRevision = chooseRemoteRevision({probeable, probedRevision: revision, baseRevision})
        const remoteStatus = evaluateSync({remoteRevision, baseRevision, dirty: deriveDirty(syncState)})
        if (autoloadIntent({status: remoteStatus, probeable, enabled: autosaveEnabled}) === 'idle') return
        if (probeToken.current !== token) return
        autoloadInFlight.current = true
        void loadRef.current().finally(() => {
            autoloadInFlight.current = false
        })
    }, [target, probeable, syncState, autosaveEnabled, conflict, deriveDirty, probeToken])

    // Runs one automatic save from the freshest inputs: idle when nothing to write, else routes through save() so a
    // 'write' persists and a 'conflict' raises the conflict modal — never a silent overwrite. Guarded against firing
    // while a save runs or a conflict is already open.
    const runAutosave = useCallback(async () => {
        if (savingRef.current || conflict || !target) return
        if (autosaveIntent({status, probeable, enabled: autosaveEnabled, dirty}) === 'idle') return
        await save(true)
    }, [conflict, target, status, probeable, autosaveEnabled, dirty, save, savingRef])

    // A separate, longer debounce than the dirty recompute, so edits settle before an automatic save writes.
    const autosaveDebounced = useDebouncedCallback(() => void runAutosave(), AUTOSAVE_DEBOUNCE_MS)

    // Cancels the pending autosave debounce and writes immediately; the page-inactive triggers call this to flush before
    // the tab is hidden or torn down.
    const flushAutosave = useCallback(() => {
        autosaveDebounced.cancel()
        void runAutosave()
    }, [autosaveDebounced, runAutosave])

    // Whether there is unsaved work a clean write could flush, which gates the before-unload confirmation nag.
    const hasPendingWrite = useCallback(
        () => target !== null && autosaveIntent({status, probeable, enabled: autosaveEnabled, dirty}) === 'write',
        [target, status, probeable, autosaveEnabled, dirty],
    )

    useAutosaveFlush({hasPendingWrite, flush: flushAutosave})

    // Schedule an autosave after edits settle: a snapshot-affecting write starts the (longer) autosave debounce,
    // coalescing a burst of edits into one write (a per-device view-key write never does). Cancel it on cleanup so a
    // pending save never fires against a torn-down instance.
    useEffect(() => {
        const unsubscribe = subscribeToDataWrites(autosaveDebounced)
        return () => {
            unsubscribe()
            autosaveDebounced.cancel()
        }
    }, [autosaveDebounced])

    return {maybeAutoload}
}
