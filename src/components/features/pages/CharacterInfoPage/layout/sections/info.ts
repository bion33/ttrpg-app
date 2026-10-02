import type {FieldNode} from '@type/FieldNode.ts'
import type {InfoSheetFactory} from '@pages/CharacterInfoPage/layout/nodes.ts'

// ---- INTERNAL CONSTANTS ----

const TRAIT_BOX_X = 293           // shared left edge of the ideals/bonds/flaws boxes
const TRAIT_BOX_WIDTH = 234       // shared width of those boxes
const TRAIT_BOX_HEIGHT = 48       // shared writing height of those boxes
const TRAIT_BOX_TOP_Y = 582       // top of the first (ideals) box
const TRAIT_BOX_STEP = 72         // vertical gap between successive boxes

/**
 * The equal-sized trait boxes stacked below PERSONALITY TRAITS, top to bottom.
 */
const TRAIT_BOXES = ['ideals', 'bonds', 'flaws']

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds the character-info section: the backstory prose area, the personality subsection (the personality-traits box
 * and the stacked ideals/bonds/flaws boxes), and the character details area. All coordinates are in the artwork's
 * viewBox units (see FieldDefinition).
 */
export function buildInfo({inputNode}: InfoSheetFactory) {
    const traitBoxes = TRAIT_BOXES.map((id, index) => traitBox(inputNode, id, index))

    return {
        backstory: inputNode({id: 'backstory', x: 44, y: 510, width: 224, height: 498, type: 'textarea', fontSize: 12}),

        personality: {
            personalityTraits: inputNode({id: 'personalityTraits', x: 293, y: 510, width: 234, height: 48, type: 'textarea', fontSize: 12}),
            traitBoxes,
        },

        details: inputNode({id: 'details', x: 552, y: 499, width: 219, height: 274, type: 'textarea', fontSize: 12}),
    }
}

// ---- PRIVATE FUNCTIONS ----

/**
 * The textarea for the trait box at the given position (0-based, top to bottom).
 */
function traitBox(inputNode: InfoSheetFactory['inputNode'], id: string, index: number): FieldNode {
    return inputNode({
        id,
        x: TRAIT_BOX_X,
        y: TRAIT_BOX_TOP_Y + index * TRAIT_BOX_STEP,
        width: TRAIT_BOX_WIDTH,
        height: TRAIT_BOX_HEIGHT,
        type: 'textarea',
        fontSize: 12,
    })
}
