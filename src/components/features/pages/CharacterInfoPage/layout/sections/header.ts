import type {InfoSheetFactory} from '@pages/CharacterInfoPage/layout/nodes.ts'

/**
 * Builds the character-info header fields: character name and the physical-description grid (age/height/weight over
 * eyes/skin/hair), laid out over the same header artwork as the character sheet.
 */
export function buildHeader({inputNode}: InfoSheetFactory) {
    return {
        characterName: inputNode({
            id: 'characterName',
            x: 88,
            y: 82,
            width: 230,
            height: 28,
            type: 'text',
            fontSize: 24,
            textAlign: 'center'
        }),

        age: inputNode({id: 'age', x: 360, y: 64, width: 146, height: 22, type: 'text', fontSize: 18}),
        height: inputNode({id: 'height', x: 510, y: 64, width: 122, height: 22, type: 'text', fontSize: 18}),
        weight: inputNode({id: 'weight', x: 639, y: 64, width: 116, height: 22, type: 'text', fontSize: 18}),

        eyes: inputNode({id: 'eyes', x: 360, y: 98, width: 146, height: 22, type: 'text', fontSize: 18}),
        skin: inputNode({id: 'skin', x: 510, y: 98, width: 122, height: 22, type: 'text', fontSize: 18}),
        hair: inputNode({id: 'hair', x: 639, y: 98, width: 116, height: 22, type: 'text', fontSize: 18}),
    }
}
