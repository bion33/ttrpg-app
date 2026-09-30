import type {Atom, Getter} from 'jotai'
import {atom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {notifyingStorage} from './storage/observableStorage.ts'
import type {FieldDefinition} from '../types/FieldDefinition.ts'
import type {DerivedNode, FieldNode, FieldValue, InputNode, NodeTree} from '../types/FieldNode.ts'
import type {CheckFieldDefinition} from "../types/CheckFieldDefinition.ts";

/**
 * A generic system for overlaying form fields on artwork, backed by jotai atoms.
 * Each field is a *node* carrying both its layout (`definition`) and the atom that
 * holds its value, so a field's position and its state are one thing. An atom holds
 * the field's *natural* type - a string (text), a number or null (number), or a
 * boolean (check) - so cross-field logic reads it directly; parsing and formatting
 * live only in the UI controls.
 */

// ---- INTERNAL TYPES ----

/**
 * The value type a field's atom holds, from its `type`: boolean (check), number-or-null (number), else string.
 */
type ValueForType<Type extends FieldDefinition['type']> =
    Type extends 'check' ? boolean : Type extends 'number' ? number | null : string

// ---- EXPORTED FUNCTIONS ----

/**
 * A factory bound to a storage-key prefix. Instantiate once per form so every
 * input field shares the prefix (and thus a stable localStorage key namespace).
 */
export function createFieldFactory(storagePrefix: string) {
    /**
     * The localStorage key for a field id under this factory's prefix.
     */
    function storageKey(id: string): string {
        return `${storagePrefix}.field.${id}`
    }

    /**
     * Builds a writable, persisted field node from its definition; the value type follows the field's `type`.
     */
    function inputNode<Definition extends FieldDefinition>(definition: Definition): InputNode<ValueForType<Definition['type']>> {
        type Value = ValueForType<Definition['type']>
        return {
            definition,
            atom: atomWithStorage<Value>(storageKey(definition.id), initialValue(definition) as Value, notifyingStorage<Value>(), {getOnInit: true}),
        }
    }

    /**
     * Builds a writable, persisted checkbox field node from its check definition.
     */
    function checkNode(definition: CheckFieldDefinition): InputNode<boolean> {
        return inputNode(definition)
    }

    /**
     * Builds a field that shows a computed value while `enabled` holds, and is an editable and persisted input otherwise.
     */
    function computedInputNode<T extends FieldValue>(
        definition: FieldDefinition,
        enabled: Atom<boolean>,
        compute: (get: Getter) => T,
    ): InputNode<T> {
        const stored = atomWithStorage<T>(storageKey(definition.id), initialValue(definition) as T, notifyingStorage<T>(), {getOnInit: true})
        const value = atom(
            (get) => (get(enabled) ? compute(get) : get(stored)),
            (get, set, next: T) => {
                // Writes are dropped while the computed value is in effect.
                if (!get(enabled)) set(stored, next)
            },
        )
        return {definition, atom: value, readOnlyAtom: enabled}
    }

    return {inputNode, checkNode, computedInputNode}
}

/**
 * Builds a read-only field node whose value is computed from other atoms.
 */
export function derivedNode<T extends FieldValue>(definition: FieldDefinition, read: (get: Getter) => T): DerivedNode<T> {
    return {
        definition,
        readOnly: true,
        atom: atom(read),
    }
}

/**
 * Flattens a node tree into a render list of its field nodes.
 */
export function collectNodes(tree: NodeTree): FieldNode[] {
    if (isFieldNode(tree)) return [tree]
    if (Array.isArray(tree)) return tree.flatMap(collectNodes)
    return Object.values(tree).flatMap(collectNodes)
}

// ---- PRIVATE FUNCTIONS ----

/**
 * The initial atom value for a field: its declared default, or the empty value for its type.
 */
function initialValue(definition: FieldDefinition): FieldValue {
    if (definition.defaultValue !== undefined) return definition.defaultValue
    switch (definition.type) {
        case 'number':
            return null
        case 'check':
            return false
        default:
            return ''
    }
}

/**
 * Whether a tree is a single field node rather than a group.
 */
function isFieldNode(tree: NodeTree): tree is FieldNode {
    return 'definition' in tree
}
