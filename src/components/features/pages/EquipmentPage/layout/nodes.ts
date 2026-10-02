import {createFieldFactory, derivedNode} from '@lib/fields/fieldNodes.ts'

/**
 * The node builders one equipment sheet is assembled from, all bound to a single storage-key prefix so every field
 * shares that localStorage namespace. `derivedNode` needs no prefix but travels with the others for convenience.
 */
export type EquipmentSheetFactory = ReturnType<typeof createFieldFactory> & { derivedNode: typeof derivedNode }

/**
 * Builds the node factory for one equipment sheet instance. Call once per sheet (per storage prefix); the section
 * builders in `sheet.ts` all draw their `inputNode`/`computedInputNode`/`derivedNode` from the returned factory.
 */
export function createEquipmentSheetFactory(storagePrefix: string): EquipmentSheetFactory {
    return {...createFieldFactory(storagePrefix), derivedNode}
}
