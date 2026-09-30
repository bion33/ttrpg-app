import type {WritableAtom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {notifyingStorage} from '@lib/storage/observableStorage.ts'

// ---- INTERNAL STATE ----

// One shared atom instance per storage prefix, cached so a page reads/writes the same atom across renders.
const markdownAtoms = new Map<string, WritableAtom<string, [string | ((previous: string) => string)], void>>()

// ---- EXPORTED FUNCTIONS ----

/**
 * The persisted markdown string for the notes page at the given storage prefix — one shared atom instance per prefix.
 * Empty until the user types. Uses notifyingStorage so edits feed dirty-detection and the whole-library snapshot.
 * getOnInit reads storage synchronously on first render so the uncontrolled editor mounts with the stored content.
 */
export function markdownAtom(prefix: string) {
    let existing = markdownAtoms.get(prefix)
    if (!existing) {
        existing = atomWithStorage(`${prefix}:markdown`, '', notifyingStorage<string>(), {getOnInit: true})
        markdownAtoms.set(prefix, existing)
    }
    return existing
}
