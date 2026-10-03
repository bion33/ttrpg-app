import type {SheetFactory} from '@lib/fields/fieldNodes.ts'

/**
 * Builds the character-info header fields: character name and the physical-description grid (age/height/weight over
 * eyes/skin/hair), laid out over the same header artwork as the character sheet.
 */
export function buildHeader({inputNode}: SheetFactory) {
    return {
        characterName: inputNode({
            id: 'characterName',
            x: 88,
            y: 88,
            width: 230,
            height: 28,
            type: 'text',
            fontSize: 24,
            textAlign: 'center'
        }),

        age: inputNode({id: 'age', x: 354, y: 68, width: 146, height: 22, type: 'text', fontSize: 18}),
        height: inputNode({id: 'height', x: 504, y: 68, width: 126, height: 22, type: 'text', fontSize: 18}),
        weight: inputNode({id: 'weight', x: 633, y: 68, width: 126, height: 22, type: 'text', fontSize: 18}),

        eyes: inputNode({id: 'eyes', x: 354, y: 102, width: 146, height: 22, type: 'text', fontSize: 18}),
        skin: inputNode({id: 'skin', x: 504, y: 102, width: 126, height: 22, type: 'text', fontSize: 18}),
        hair: inputNode({id: 'hair', x: 633, y: 102, width: 126, height: 22, type: 'text', fontSize: 18}),
    }
}
