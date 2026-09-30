import type {LibrarySnapshot} from '../snapshot.ts'
import type {StorageProvider, StorageTarget} from './StorageProvider.ts'

// The default filename offered when saving, and the accept filter when opening.
const DEFAULT_FILENAME = 'ttrpg-app.json'

/**
 * Serialises a snapshot to the JSON text written to an exported file (pretty-printed for a human-readable file).
 */
export function serialiseSnapshot(snapshot: LibrarySnapshot): string {
    return JSON.stringify(snapshot, null, 2)
}

/**
 * Parses and validates exported JSON text back into a snapshot, throwing a clear error when the shape is not a valid
 * library file.
 */
export function parseSnapshot(text: string): LibrarySnapshot {
    let value: unknown
    try {
        value = JSON.parse(text)
    } catch {
        throw new Error('This file is not valid JSON.')
    }
    if (!isSnapshot(value)) throw new Error('This file is not a valid library export.')
    return value
}

// Narrows unknown parsed JSON to a LibrarySnapshot by checking every field's type.
function isSnapshot(value: unknown): value is LibrarySnapshot {
    if (typeof value !== 'object' || value === null) return false
    const candidate = value as Record<string, unknown>
    if (typeof candidate.version !== 'number') return false
    if (typeof candidate.revision !== 'string') return false
    if (typeof candidate.savedAt !== 'string') return false
    if (typeof candidate.entries !== 'object' || candidate.entries === null) return false
    return Object.values(candidate.entries as Record<string, unknown>).every((entry) => typeof entry === 'string')
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
        } catch {
            // The user dismissed the picker.
            return null
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
    async connect() {},
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
