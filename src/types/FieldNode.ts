import type {Atom} from 'jotai'
import type {atomWithStorage} from 'jotai/utils'
import type {FieldDefinition} from './FieldDefinition.ts'

/**
 * The concrete atom type produced by atomWithStorage for a string field.
 */
export type StoredAtom = ReturnType<typeof atomWithStorage<string>>

/**
 * An editable field: its atom is writable and persisted to localStorage.
 */
export type InputNode = { readOnly?: false; def: FieldDefinition; atom: StoredAtom }

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
