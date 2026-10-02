import type {InfoSheetFactory} from '@pages/CharacterInfoPage/layout/nodes.ts'

/**
 * Builds the character-info appearance field: a region describing how the character looks, usable as prose or a single
 * image (switched via its "…" menu). All coordinates are in the artwork's viewBox units (see FieldDefinition).
 */
export function buildAppearance({inputNode}: InfoSheetFactory) {
    return {
        appearance: inputNode({
            id: 'appearance', x: 44, y: 168, width: 224, height: 302, type: 'imageTextarea', fontSize: 12,
        }),
    }
}
