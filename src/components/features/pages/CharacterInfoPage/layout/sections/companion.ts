import type {InfoSheetFactory} from '@pages/CharacterInfoPage/layout/nodes.ts'
import type {FieldNode} from '@type/FieldNode.ts'

// Shared geometry for the companion name/species/size fields: they share a bottom edge (the thin rule above the
// labels) and sizing, and tile horizontally across that rule, divided at the SPECIES and SIZE label starts.
const FIELD_Y = 804.37
const FIELD_HEIGHT = 14
const FIELD_FONT_SIZE = 12
const LINE_START_X = 306.84
const SPECIES_START_X = 419.81
const SIZE_START_X = 521.01
const LINE_END_X = 541.12
// Gap between adjacent fields, taken off the end of the preceding field (name and species).
const FIELD_GAP = 4

// The companion stat block: a rectangular value input tucked under each of the AC, HP, and SPEED labels
const STAT_WIDTH = 28
const STAT_HEIGHT = 20

// The companion's attacks: six identically sized text boxes stacked below the ATTACKS label, each filling one printed
// box (the sixth continues one step past the last drawn box).
const ATTACK_X = 317.9
const ATTACK_BONUS_X = 317
const ATTACK_Y = 890.3
const ATTACK_WIDTH = 127.5
const ATTACK_ROW_STEP = 21
const ATTACK_ROW_COUNT = 6
// Gap between adjacent attack boxes, split evenly as top/bottom margin so each box stays centred in its row slot (the
// top box leaves half the gap above, the bottom box half below).
const ATTACK_GAP = 4
const ATTACK_HEIGHT = ATTACK_ROW_STEP - ATTACK_GAP

// An even row's split: a narrow signed bonus and the effect taking the rest of the box width, ATTACK_GAP apart.
const ATTACK_BONUS_WIDTH = 22
const ATTACK_BONUS_GAP = 6
const ATTACK_EFFECT_WIDTH = ATTACK_WIDTH - ATTACK_BONUS_GAP - ATTACK_BONUS_WIDTH + (ATTACK_X - ATTACK_BONUS_X)

/**
 * One companion attack row (1-based). An odd row is a single text box ('attackN'); an even row splits the box into a
 * signed numeric bonus ('attackBonusN') and a text effect ('attackEffectN') sharing its width, ATTACK_GAP apart.
 */
function attackRow(inputNode: InfoSheetFactory['inputNode'], row: number): FieldNode[] {
    const y = ATTACK_Y + ATTACK_GAP / 2 + (row - 1) * ATTACK_ROW_STEP

    if (row % 2 === 1) {
        return [inputNode({id: `attack${row}`, x: ATTACK_X, y, width: ATTACK_WIDTH, height: ATTACK_HEIGHT, type: 'text', fontSize: 12})]
    }

    return [
        inputNode({id: `attackBonus${row}`, x: ATTACK_BONUS_X, y, width: ATTACK_BONUS_WIDTH, height: ATTACK_HEIGHT, type: 'number', signed: true, fontSize: 10}),
        inputNode({id: `attackEffect${row}`, x: ATTACK_BONUS_X + ATTACK_BONUS_WIDTH + ATTACK_GAP, y, width: ATTACK_EFFECT_WIDTH, height: ATTACK_HEIGHT, type: 'text', fontSize: 12}),
    ]
}

/**
 * Builds the character-info companion fields: the companion's name, species, and size sitting above the thin rule over
 * their printed labels, plus the square AC/HP/SPEED stat inputs. All coordinates are in the artwork's viewBox units.
 */
export function buildCompanion({inputNode}: InfoSheetFactory) {
    return {
        header: {
            name: inputNode({
                id: 'name',
                x: LINE_START_X,
                y: FIELD_Y,
                width: SPECIES_START_X - LINE_START_X - FIELD_GAP,
                height: FIELD_HEIGHT,
                type: 'text',
                fontSize: FIELD_FONT_SIZE
            }),
            species: inputNode({
                id: 'species',
                x: SPECIES_START_X,
                y: FIELD_Y,
                width: SIZE_START_X - SPECIES_START_X - FIELD_GAP,
                height: FIELD_HEIGHT,
                type: 'text',
                fontSize: FIELD_FONT_SIZE
            }),
            size: inputNode({
                id: 'size',
                x: SIZE_START_X,
                y: FIELD_Y,
                width: LINE_END_X - SIZE_START_X,
                height: FIELD_HEIGHT,
                type: 'text',
                fontSize: FIELD_FONT_SIZE,
                textAlign: 'center'
            }),
        },

        stats: {
            hitPoints: inputNode({
                id: 'hitPoints',
                x: 310.5,
                y: 847,
                width: STAT_WIDTH,
                height: STAT_HEIGHT,
                type: 'number',
                fontSize: 16
            }),
            armorClass: inputNode({
                id: 'armorClass',
                x: 366.5,
                y: 842,
                width: STAT_WIDTH,
                height: STAT_HEIGHT,
                type: 'number',
                fontSize: 20
            }),
            speed: inputNode({
                id: 'speed',
                x: 422.5,
                y: 847,
                width: STAT_WIDTH,
                height: STAT_HEIGHT,
                type: 'number',
                fontSize: 16
            }),
        },

        attacks: Array.from({length: ATTACK_ROW_COUNT}, (_, index) => attackRow(inputNode, index + 1)),

        details: inputNode({
            id: 'details',
            x: 556,
            y: 804,
            width: 214,
            height: 214,
            type: 'textarea',
            fontSize: 12
        }),
    }
}
