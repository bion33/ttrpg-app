import type {FieldNode} from '../../../../../types/FieldNode.ts'
import type {SheetFactory} from '../nodes.ts'
import type {CheckFieldDefinition} from "../../../../../types/CheckFieldDefinition.ts";

// ---- INTERNAL CONSTANTS ----

const DAMAGE_ROW_STEP = 12.67    // vertical gap between damage-type rows
const DAMAGE_COL_STEP = 6.67     // horizontal gap: immunity -> resistance -> vulnerability
const DAMAGE_BLOCK_Y = 271.73

/**
 * The three damage-type column groups across the sheet.
 */
const DAMAGE_BLOCKS: DamageBlock[] = [
    {x: 560.67, types: ['bludgeoning', 'piercing', 'slashing', 'cold', 'fire']},
    {x: 628.53, types: ['poison', 'acid', 'psychic', 'necrotic']},
    {x: 697.87, types: ['radiant', 'lightning', 'thunder', 'force']},
]

const DAMAGE_LEVELS: { suffix: string; color: CheckFieldDefinition['color'] }[] = [
    {suffix: 'Immunity', color: 'green'},
    {suffix: 'Resistance', color: 'goldenrod'},
    {suffix: 'Vulnerability', color: 'firebrick'},
]

// ---- INTERNAL TYPES ----

/**
 * One damage-type column group: its x anchor and the types stacked in it.
 */
type DamageBlock = { x: number; types: string[] }

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds the trait fields: free-text notes, the damage immunity/resistance/vulnerability grid, and proficiencies.
 */
export function buildTraits({inputNode}: SheetFactory) {
    const notes = inputNode({id: 'notes', x: 44, y: 878, width: 476, height: 154, type: 'textarea', fontSize: 12})

    const damage = DAMAGE_BLOCKS.map((block) => damageBlock(inputNode, block))

    const proficiencies = {
        languages: inputNode({id: 'languages', x: 548, y: 364, width: 224, height: 50, type: 'textarea', fontSize: 12}),
        weapons: inputNode({id: 'weapons', x: 594, y: 417, width: 177, height: 12, type: 'text', fontSize: 12}),
        armor: inputNode({id: 'armor', x: 583, y: 432, width: 187, height: 12, type: 'text', fontSize: 12}),
        tools: inputNode({id: 'tools', x: 579, y: 447, width: 191, height: 12, type: 'text', fontSize: 12}),
        advantages: inputNode({id: 'advantages', x: 548, y: 474, width: 224, height: 12, type: 'text', fontSize: 12}),
        disadvantages: inputNode({id: 'disadvantages', x: 548, y: 500, width: 224, height: 12, type: 'text', fontSize: 12}),
        featuresAndTraits: inputNode({
            id: 'featuresAndTraits',
            x: 548,
            y: 528,
            width: 224,
            height: 504,
            type: 'textarea',
            fontSize: 12
        }),
    }

    return {notes, damage, proficiencies}
}

// ---- PRIVATE FUNCTIONS ----

/**
 * Immunity/resistance/vulnerability checkboxes for one damage type.
 */
function damageTypeRow(inputNode: SheetFactory['inputNode'], type: string, blockX: number, y: number): FieldNode[] {
    return DAMAGE_LEVELS.map((lvl, col) => inputNode({
        id: `${type}${lvl.suffix}`,
        x: blockX + col * DAMAGE_COL_STEP,
        y,
        width: 6,
        height: 6,
        type: 'check',
        color: lvl.color,
    } as CheckFieldDefinition))
}

/**
 * All damage-type rows for one column group.
 */
function damageBlock(inputNode: SheetFactory['inputNode'], block: DamageBlock): FieldNode[] {
    return block.types.flatMap((type, row) =>
        damageTypeRow(inputNode, type, block.x, DAMAGE_BLOCK_Y + row * DAMAGE_ROW_STEP),
    )
}
