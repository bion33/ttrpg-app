import type {LibrarySnapshot} from './snapshot.ts'

/**
 * The small metadata header of a snapshot: its version, revision GUID, and save timestamp, without the entries. Written
 * as a sidecar beside a cloud snapshot so a revision probe need not download the whole library.
 */
export interface SnapshotMetadata {
    version: number
    revision: string
    savedAt: string
}

// The sidecar content written before a snapshot body is rewritten: it marks the sidecar as not describing the body, so
// a probe during (or after a failed) save falls back to the body instead of trusting a soon-to-be-stale revision.
const INVALIDATED_METADATA = {valid: false}

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

/**
 * Extracts the metadata header (version, revision, savedAt) from a snapshot, dropping its entries.
 */
export function extractMetadata(snapshot: LibrarySnapshot): SnapshotMetadata {
    return {version: snapshot.version, revision: snapshot.revision, savedAt: snapshot.savedAt}
}

/**
 * Serialises a snapshot's metadata header to the JSON text written to its sidecar.
 */
export function serialiseMetadata(metadata: SnapshotMetadata): string {
    return JSON.stringify(metadata, null, 2)
}

/**
 * Serialises the invalidation marker written to a sidecar before its snapshot body is rewritten.
 */
export function serialiseInvalidatedMetadata(): string {
    return JSON.stringify(INVALIDATED_METADATA, null, 2)
}

/**
 * Parses sidecar JSON text into snapshot metadata, or null when the sidecar holds the invalidation marker (so the
 * caller falls back to the body); throws a clear error when the text is neither valid metadata nor the marker.
 */
export function parseMetadata(text: string): SnapshotMetadata | null {
    let value: unknown
    try {
        value = JSON.parse(text)
    } catch {
        throw new Error('This file is not valid JSON.')
    }
    if (isInvalidationMarker(value)) return null
    if (!isMetadata(value)) throw new Error('This file is not valid snapshot metadata.')
    return value
}

// True when parsed JSON is the invalidation marker a save writes while its body is mid-rewrite.
function isInvalidationMarker(value: unknown): boolean {
    return typeof value === 'object' && value !== null && (value as Record<string, unknown>).valid === false
}

// Narrows unknown parsed JSON to SnapshotMetadata by checking every field's type.
function isMetadata(value: unknown): value is SnapshotMetadata {
    if (typeof value !== 'object' || value === null) return false
    const candidate = value as Record<string, unknown>
    return typeof candidate.version === 'number'
        && typeof candidate.revision === 'string'
        && typeof candidate.savedAt === 'string'
}

/**
 * Derives a snapshot locator's sidecar locator by swapping a trailing `.json` for `.metadata.json` (appending it when
 * the locator has no `.json`); works for both bare filenames and the full WebDAV URL a provider uses as its locator.
 */
export function metadataLocator(locator: string): string {
    if (locator.endsWith('.json')) return `${locator.slice(0, -'.json'.length)}.metadata.json`
    return `${locator}.metadata.json`
}
