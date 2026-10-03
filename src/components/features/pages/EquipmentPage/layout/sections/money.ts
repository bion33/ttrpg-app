import type {SheetFactory} from '@lib/fields/fieldNodes.ts'

/**
 * Builds the money fields: the coin counts (platinum, gold, electrum, silver, copper) above their printed labels.
 *
 * All coordinates are in the artwork's viewBox units (see FieldDefinition).
 */
export function buildMoney({inputNode, checkNode}: SheetFactory) {
    return {
        enableMoneyWeightCalculation: checkNode({
            id: 'enableMoneyWeightCalculation',
            x: 364,
            y: 649,
            width: 7.25,
            height: 9,
            type: 'check',
            shape: 'star',
            defaultValue: true,
        }),

        platinum: inputNode({id: 'platinum', x: 392, y: 632, width: 40, height: 40, type: 'number', fontSize: 24}),
        gold: inputNode({id: 'gold', x: 451, y: 632, width: 40, height: 40, type: 'number', fontSize: 24}),
        electrum: inputNode({id: 'electrum', x: 510, y: 632, width: 40, height: 40, type: 'number', fontSize: 24}),
        silver: inputNode({id: 'silver', x: 568, y: 632, width: 40, height: 40, type: 'number', fontSize: 24}),
        copper: inputNode({id: 'copper', x: 626, y: 632, width: 40, height: 40, type: 'number', fontSize: 24}),
    }
}
