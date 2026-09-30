import type {SheetFactory} from '@features/CharacterSheet/layout/nodes.ts'

/**
 * Builds the header fields: character name, class/level, and identity line.
 */
export function buildHeader({inputNode}: SheetFactory) {
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

        class: inputNode({id: 'class', x: 360, y: 64, width: 118, height: 22, type: 'text', fontSize: 18}),
        level: inputNode({
            id: 'level',
            x: 482,
            y: 64,
            width: 24,
            height: 22,
            type: 'text',
            fontSize: 18,
            textAlign: 'center'
        }),
        background: inputNode({id: 'background', x: 510, y: 64, width: 122, height: 22, type: 'text', fontSize: 18}),
        playerName: inputNode({id: 'playerName', x: 639, y: 64, width: 116, height: 22, type: 'text', fontSize: 18}),

        race: inputNode({id: 'race', x: 360, y: 98, width: 118, height: 22, type: 'text', fontSize: 18}),
        size: inputNode({
            id: 'size',
            x: 482,
            y: 98,
            width: 24,
            height: 22,
            type: 'text',
            fontSize: 18,
            textAlign: 'center'
        }),
        alignment: inputNode({id: 'alignment', x: 510, y: 98, width: 122, height: 22, type: 'text', fontSize: 18}),
        experiencePoints: inputNode({
            id: 'experiencePoints',
            x: 639.1,
            y: 98,
            width: 116,
            height: 22,
            type: 'text',
            fontSize: 18
        }),
    }
}
