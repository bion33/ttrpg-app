import {unzipSync, zipSync} from 'fflate'
import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import type {StorageProvider, StorageTarget} from './StorageProvider.ts'
import {parseSnapshot, serialiseSnapshot} from '@lib/storage/snapshotCodec.ts'
import {collectImageRefs} from '@lib/images/collectImageRefs.ts'
import {readImage, writeImageBytes} from '@lib/images/imageStore.ts'

// The default filename offered when saving, and the entry holding the snapshot JSON inside the zip bundle.
const DEFAULT_FILENAME = 'ttrpg-app.zip'
const LIBRARY_ENTRY = 'library.json'

// True when the error is the user dismissing a native file picker (a cancel), not a real failure to surface.
function isPickerCancel(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError'
}

// The minimal File System Access API surface used here; present only on Chromium, so the glue feature-detects it.
interface WritableFile {
    write(data: Blob): Promise<void>

    close(): Promise<void>
}

interface SaveFileHandle {
    createWritable(): Promise<WritableFile>
}

interface OpenFileHandle {
    getFile(): Promise<File>
}

interface FileSystemWindow {
    showSaveFilePicker?: (options?: unknown) => Promise<SaveFileHandle>
    showOpenFilePicker?: (options?: unknown) => Promise<OpenFileHandle[]>
}

const SAVE_TYPES = [{description: 'Library export', accept: {'application/zip': ['.zip']}}]
const OPEN_TYPES = [{accept: {'application/zip': ['.zip'], 'application/json': ['.json']}}]

// Writes the bundle bytes to a file the user picks via the File System Access API, falling back to an anchor download.
async function writeFile(bytes: Uint8Array): Promise<void> {
    const picker = window as unknown as FileSystemWindow
    if (picker.showSaveFilePicker) {
        // A dismissed picker throws AbortError, which propagates so the caller can tell cancel from a real failure and
        // never record a save that did not happen; a genuine failure propagates the same way.
        const handle = await picker.showSaveFilePicker({suggestedName: DEFAULT_FILENAME, types: SAVE_TYPES})
        const writable = await handle.createWritable()
        await writable.write(new Blob([bytes as BlobPart], {type: 'application/zip'}))
        await writable.close()
        return
    }
    downloadFile(bytes)
}

// Triggers a browser download of the bundle bytes (the Firefox fallback for saving).
function downloadFile(bytes: Uint8Array): void {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], {type: 'application/zip'}))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = DEFAULT_FILENAME
    anchor.click()
    URL.revokeObjectURL(url)
}

// Reads the file the user picks, via the File System Access API where available, else a hidden file input; null on
// cancel.
async function readFile(): Promise<File | null> {
    const picker = window as unknown as FileSystemWindow
    if (picker.showOpenFilePicker) {
        let handles: OpenFileHandle[]
        try {
            handles = await picker.showOpenFilePicker({types: OPEN_TYPES})
        } catch (error) {
            // A dismissed picker means nothing to load; any other failure propagates so the caller can surface it.
            if (isPickerCancel(error)) return null
            throw error
        }
        return handles[0].getFile()
    }
    return readViaInput()
}

// Reads a file through a transient hidden <input type="file"> (the Firefox fallback for opening).
function readViaInput(): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/zip,.zip,application/json,.json'
        input.onchange = () => resolve(input.files?.[0] ?? null)
        // No change event fires on cancel, so nothing resolves then; that matches "user cancelled, do nothing".
        input.click()
    })
}

// True when bytes begin with the ZIP local-file-header signature (`PK\x03\x04`), distinguishing a bundle from legacy
// bare JSON.
function isZip(bytes: Uint8Array): boolean {
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

// Builds the export bundle: the snapshot JSON plus every referenced image read from the OPFS.
async function buildBundle(snapshot: LibrarySnapshot): Promise<Uint8Array> {
    const entries: Record<string, Uint8Array> = {
        [LIBRARY_ENTRY]: new TextEncoder().encode(serialiseSnapshot(snapshot)),
    }
    for (const path of collectImageRefs(snapshot.entries)) {
        const blob = await readImage(path)
        if (blob) entries[path] = new Uint8Array(await blob.arrayBuffer())
    }
    return zipSync(entries)
}

// Extracts the snapshot from a bundle's bytes and writes its images into the OPFS; throws when the snapshot is missing.
async function openBundle(bytes: Uint8Array): Promise<LibrarySnapshot> {
    const entries = unzipSync(bytes)
    const library = entries[LIBRARY_ENTRY]
    if (!library) throw new Error('This file is not a valid library export.')
    for (const [path, content] of Object.entries(entries)) {
        if (path !== LIBRARY_ENTRY) await writeImageBytes(path, new Blob([content as BlobPart]))
    }
    return parseSnapshot(new TextDecoder().decode(library))
}

/**
 * The file import/export provider: the user picks a file on each save and load, so there is no connection to maintain
 * and no way to probe a revision silently. It bundles the snapshot and every referenced image into a portable zip
 * (falling back to reading a legacy bare `.json` on load), so file-based libraries stay self-contained.
 */
export const fileProvider: StorageProvider = {
    id: 'file',
    async connect() {
    },
    isConnected() {
        return true
    },
    async save(_target: StorageTarget, snapshot: LibrarySnapshot) {
        await writeFile(await buildBundle(snapshot))
    },
    async load(_target: StorageTarget) {
        const file = await readFile()
        if (file === null) return null
        const bytes = new Uint8Array(await file.arrayBuffer())
        // A zip is the current bundle; anything else is read as a legacy bare JSON export.
        if (isZip(bytes)) return openBundle(bytes)
        return parseSnapshot(new TextDecoder().decode(bytes))
    },
    async readRevision() {
        return null
    },
}
