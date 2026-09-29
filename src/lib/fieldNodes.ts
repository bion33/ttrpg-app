import type {Atom, Getter} from 'jotai'
import {atom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import type {FieldDefinition} from '../types/FieldDefinition.ts'
import type {DerivedNode, FieldNode, InputNode, NodeTree} from '../types/FieldNode.ts'
import type {CheckFieldDefinition} from "../types/CheckFieldDefinition.ts";

/**
 * A generic system for overlaying form fields on artwork, backed by jotai atoms.
 * Each field is a *node* carrying both its layout (`definition`) and the atom that
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
    function inputNode(definition: FieldDefinition | CheckFieldDefinition): InputNode {
        // Field values are stored as strings; normalize any default (number/boolean) to match.
        const initial = definition.defaultValue === undefined ? '' : String(definition.defaultValue)
        return {
            definition,
            atom: atomWithStorage(storageKey(definition.id), initial, undefined, {getOnInit: true}),
        }
    }

    /**
     * Builds a writable, persisted checkbox field node from its check definition.
     */
    function checkNode(definition: CheckFieldDefinition): InputNode {
        return inputNode(definition)
    }

    /**
     * Builds a field that shows a computed value while `enabled` holds, and is an editable and persisted input otherwise.
     */
    function computedInputNode(
        definition: FieldDefinition,
        enabled: Atom<boolean>,
        compute: (get: Getter) => string,
    ): InputNode {
        const initial = definition.defaultValue === undefined ? '' : String(definition.defaultValue)
        const stored = atomWithStorage(storageKey(definition.id), initial, undefined, {getOnInit: true})
        const value = atom(
            (get) => (get(enabled) ? compute(get) : get(stored)),
            (get, set, next: string) => {
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
export function derivedNode(definition: FieldDefinition, read: (get: Getter) => string): DerivedNode {
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

/**
 * Places number fields on a grid; ids[row][column] is each cell's field id.
 */
export function numberGrid(
    inputNode: (definition: FieldDefinition) => InputNode,
    ids: string[][],
    options: {
        x0: number;
        y0: number;
        columnStep: number;
        rowStep: number;
        width: number;
        height: number;
        fontSize: number
    },
): InputNode[] {
    return ids.flatMap((columns, row) =>
        columns.map((id, column) => inputNode({
            id,
            x: options.x0 + column * options.columnStep,
            y: options.y0 + row * options.rowStep,
            width: options.width,
            height: options.height,
            type: 'number',
            fontSize: options.fontSize,
        })),
    )
}

// ---- PRIVATE FUNCTIONS ----

/**
 * Whether a tree is a single field node rather than a group.
 */
function isFieldNode(tree: NodeTree): tree is FieldNode {
    return 'definition' in tree
}