import type {Getter} from 'jotai'
import {atom} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import type {FieldDefinition} from '../types/FieldDefinition.ts'
import type {DerivedNode, FieldNode, InputNode, NodeTree} from '../types/FieldNode.ts'

/**
 * A generic system for overlaying form fields on artwork, backed by jotai atoms.
 * Each field is a *node* carrying both its layout (`def`) and the atom that
 * holds its value, so a field's position and its state are one thing.
 */

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
    function inputNode(def: FieldDefinition): InputNode {
        return {
            def,
            atom: atomWithStorage(storageKey(def.id), def.defaultValue ?? '', undefined, {getOnInit: true}),
        }
    }

    return {inputNode}
}

/**
 * Builds a read-only field node whose value is computed from other atoms.
 */
export function derivedNode(def: FieldDefinition, read: (get: Getter) => string): DerivedNode {
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
 * Whether a tree is a single field node rather than a group.
 */
function isFieldNode(tree: NodeTree): tree is FieldNode {
    return 'def' in tree
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
