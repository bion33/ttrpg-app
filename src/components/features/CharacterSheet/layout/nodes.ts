import {createFieldFactory, derivedNode} from '../../../../lib/fieldNodes.ts'

/**
 * The node builders one character sheet is assembled from, all bound to a single storage-key prefix so every field
 * shares that localStorage namespace. `derivedNode` needs no prefix but travels with the others for convenience.
 */
export type SheetFactory = ReturnType<typeof createFieldFactory> & { derivedNode: typeof derivedNode }

/**
 * Builds the node factory for one character sheet instance. Call once per sheet (per storage prefix); the section
 * builders in `sheet.ts` all draw their `inputNode`/`computedInputNode`/`derivedNode` from the returned factory.
 */
export function createSheetFactory(storagePrefix: string): SheetFactory {
    return {...createFieldFactory(storagePrefix), derivedNode}
}
