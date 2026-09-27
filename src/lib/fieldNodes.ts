import type {Atom, Getter} from 'jotai'
import {atom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import type {FieldDefinition} from '../types/FieldDefinition.ts'
import type {DerivedNode, FieldNode, InputNode, NodeTree} from '../types/FieldNode.ts'
import type {CheckFieldDefinition} from "../types/CheckFieldDefinition.ts";

/**
 * A generic system for overlaying form fields on artwork, backed by jotai atoms.
 * Each field is a *node* carrying both its layout (`def`) and the atom that
 * holds its value, so a field's position and its state are one thing.
 */

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
     * Builds a writable, persisted field node from its definition.
     */
    function inputNode(def: FieldDefinition | CheckFieldDefinition): InputNode {
        // Field values are stored as strings; normalize any default (number/boolean) to match.
        const initial = def.defaultValue === undefined ? '' : String(def.defaultValue)
        return {
            def,
            atom: atomWithStorage(storageKey(def.id), initial, undefined, {getOnInit: true}),
        }
    }

    /**
     * Builds a field that shows a computed value while `enabled` holds, and is an editable and persisted input otherwise.
     */
    function computedInputNode(
        def: FieldDefinition | CheckFieldDefinition,
        enabled: Atom<boolean>,
        compute: (get: Getter) => string,
    ): InputNode {
        const initial = def.defaultValue === undefined ? '' : String(def.defaultValue)
        const stored = atomWithStorage(storageKey(def.id), initial, undefined, {getOnInit: true})
        const value = atom(
            (get) => (get(enabled) ? compute(get) : get(stored)),
            (get, set, next: string) => {
                // Writes are dropped while the computed value is in effect.
                if (!get(enabled)) set(stored, next)
            },
        )
        return {def, atom: value, readOnlyAtom: enabled}
    }

    return {inputNode, computedInputNode}
}

/**
 * Builds a read-only field node whose value is computed from other atoms.
 */
export function derivedNode(def: FieldDefinition | CheckFieldDefinition, read: (get: Getter) => string): DerivedNode {
    return {
        def,
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

/**
 * Places number fields on a grid; ids[row][col] is each cell's field id.
 */
export function numberGrid(
    inputNode: (def: FieldDefinition) => InputNode,
    ids: string[][],
    opts: { x0: number; y0: number; colStep: number; rowStep: number; width: number; height: number; fontSize: number },
): InputNode[] {
    return ids.flatMap((cols, row) =>
        cols.map((id, col) => inputNode({
            id,
            x: opts.x0 + col * opts.colStep,
            y: opts.y0 + row * opts.rowStep,
            width: opts.width,
            height: opts.height,
            type: 'number',
            fontSize: opts.fontSize,
        })),
    )
}

// ---- PRIVATE FUNCTIONS ----

/**
 * Whether a tree is a single field node rather than a group.
 */
function isFieldNode(tree: NodeTree): tree is FieldNode {
    return 'def' in tree
}