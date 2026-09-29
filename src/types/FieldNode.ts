import type {Atom, WritableAtom} from 'jotai'
import type {FieldDefinition} from './FieldDefinition.ts'

/**
 * The value a field's atom holds: a string (text), a number or null (number), or a boolean (check).
 */
export type FieldValue = string | number | boolean | null

/**
 * An editable field: its atom is writable (persisted, or computed-with-fallback). `readOnlyAtom`, when
 * present, toggles editability at runtime (e.g. a computed field locked while its auto-calc is enabled).
 */
export type InputNode<T extends FieldValue = FieldValue> = {
    readOnly?: false
    definition: FieldDefinition
    atom: WritableAtom<T, [T], void>
    readOnlyAtom?: Atom<boolean>
}

/**
 * A computed field: read-only, derived from other atoms, never persisted.
 */
export type DerivedNode<T extends FieldValue = FieldValue> = { readOnly: true; definition: FieldDefinition; atom: Atom<T> }

/**
 * Any overlay field: writable or computed. The writable case is a union of the concrete value types (a
 * writable atom's value is invariant, so a single `InputNode<FieldValue>` would not accept them).
 */
export type FieldNode = InputNode<string> | InputNode<number | null> | InputNode<boolean> | DerivedNode

/**
 * A field tree is nodes nested in arrays (positional groups) and records
 * (named groups); `collectNodes` flattens any such shape into a render list.
 */
export type NodeTree = FieldNode | NodeTree[] | { [key: string]: NodeTree }
