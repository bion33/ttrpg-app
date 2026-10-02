import type {InfoSheetFactory} from '@pages/CharacterInfoPage/layout/nodes.ts'

/**
 * Builds the character-info appearance fields: the prose area describing how the character looks. All coordinates are in
 * the artwork's viewBox units (see FieldDefinition).
 */
export function buildAppearance({inputNode}: InfoSheetFactory) {
    return {
        appearance: inputNode({id: 'appearance', x: 42, y: 159, width: 228, height: 308, type: 'textarea', fontSize: 12}),
    }
}
