import type {LibrarySnapshot} from '@lib/storage/snapshot.ts'
import type {StorageProvider, StorageTarget} from './StorageProvider.ts'
import {parseSnapshot, serialiseSnapshot} from '@lib/storage/snapshotCodec.ts'

// The default filename offered when saving, and the accept filter when opening.
const DEFAULT_FILENAME = 'ttrpg-app.json'

// True when the error is the user dismissing a native file picker (a cancel), not a real failure to surface.
function isPickerCancel(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError'
}

// The minimal File System Access API surface used here; present only on Chromium, so the glue feature-detects it.
interface WritableFile {
    write(data: string): Promise<void>

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

// Writes JSON to a file the user picks via the File System Access API, falling back to an anchor download elsewhere.
async function writeFile(text: string): Promise<void> {
    const picker = window as unknown as FileSystemWindow
    if (picker.showSaveFilePicker) {
        // A dismissed picker throws AbortError, which propagates so the caller can tell cancel from a real failure and
        // never record a save that did not happen; a genuine failure propagates the same way.
        const handle = await picker.showSaveFilePicker({
            suggestedName: DEFAULT_FILENAME,
            types: [{description: 'Library export', accept: {'application/json': ['.json']}}],
        })
        const writable = await handle.createWritable()
        await writable.write(text)
        await writable.close()
        return
    }
    downloadFile(text)
}

// Triggers a browser download of the given text as a JSON file (the Firefox fallback for saving).
function downloadFile(text: string): void {
    const url = URL.createObjectURL(new Blob([text], {type: 'application/json'}))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = DEFAULT_FILENAME
    anchor.click()
    URL.revokeObjectURL(url)
}

// Reads a file the user picks, via the File System Access API where available, else a hidden file input.
async function readFile(): Promise<string | null> {
    const picker = window as unknown as FileSystemWindow
    if (picker.showOpenFilePicker) {
        let handles: OpenFileHandle[]
        try {
            handles = await picker.showOpenFilePicker({types: [{accept: {'application/json': ['.json']}}]})
        } catch (error) {
            // A dismissed picker means nothing to load; any other failure propagates so the caller can surface it.
            if (isPickerCancel(error)) return null
            throw error
        }
        return (await handles[0].getFile()).text()
    }
    return readViaInput()
}

// Reads a file through a transient hidden <input type="file"> (the Firefox fallback for opening).
function readViaInput(): Promise<string | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/json,.json'
        input.onchange = () => {
            const file = input.files?.[0]
            if (!file) {
                resolve(null)
                return
            }
            file.text().then(resolve, () => resolve(null))
        }
        // No change event fires on cancel, so nothing resolves then; that matches "user cancelled, do nothing".
        input.click()
    })
}

/**
 * The file import/export provider: the user picks a file on each save and load, so there is no connection to maintain
 * and no way to probe a revision silently — divergence is judged from the chosen file at import time.
 */
export const fileProvider: StorageProvider = {
    id: 'file',
    async connect() {
    },
    isConnected() {
        return true
    },
    async save(_target: StorageTarget, snapshot: LibrarySnapshot) {
        await writeFile(serialiseSnapshot(snapshot))
    },
    async load(_target: StorageTarget) {
        const text = await readFile()
        return text === null ? null : parseSnapshot(text)
    },
    async readRevision() {
        return null
    },
}
