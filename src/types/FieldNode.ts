import type {Atom, WritableAtom} from 'jotai'
import type {atomWithStorage} from 'jotai/utils'
import type {FieldDefinition} from './FieldDefinition.ts'

/**
 * The concrete atom type produced by atomWithStorage for a string field.
 */
export type StoredAtom = ReturnType<typeof atomWithStorage<string>>

/**
 * Any string-valued atom the UI can two-way bind: a stored atom or a computed writable atom.
 */
export type WritableStringAtom = WritableAtom<string, [string], void>

/**
 * An editable field: its atom is writable (persisted, or computed-with-fallback). `readOnlyAtom`, when
 * present, toggles editability at runtime (e.g. a computed field locked while its auto-calc is enabled).
 */
export type InputNode = {
    readOnly?: false
    def: FieldDefinition
    atom: WritableStringAtom
    readOnlyAtom?: Atom<boolean>
}

/**
 * A computed field: read-only, derived from other atoms, never persisted.
 */
export type DerivedNode = { readOnly: true; def: FieldDefinition; atom: Atom<string> }

/**
 * Any overlay field: writable or computed.
 */
export type FieldNode = InputNode | DerivedNode

/**
 * A field tree is nodes nested in arrays (positional groups) and records
 * (named groups); `collectNodes` flattens any such shape into a render list.
 */
export type NodeTree = FieldNode | NodeTree[] | { [key: string]: NodeTree }
