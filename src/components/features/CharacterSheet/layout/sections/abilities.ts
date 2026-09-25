import type {DerivedNode, InputNode} from '../../../../../types/FieldNode.ts'
import {abilityModifier, formatModifier} from '../../logic/formulas.ts'
import {derivedNode, inputNode} from '../nodes.ts'

const SAVE_BONUS_GAP = 2.5 // the saving-throw bonus input sits this far above its check

/**
 * Per-block layout anchors for one ability, from the traced artwork.
 */
export type AbilityConfig = {
    name: string
    scoreY: number       // y of the ability-score box; score/extra/modifier are relative to it
    saveOffset: number   // saving-throw check y, relative to scoreY (varies per block)
    skills: readonly string[]
    firstSkillY?: number // expertise-checkbox y of the first skill
    lastSkillY?: number  // expertise-checkbox y of the last skill (interpolation endpoint)
}

/**
 * The six ability blocks and their skills.
 */
export const ABILITIES = [
    {
        name: 'strength',
        scoreY: 242.22,
        saveOffset: -1.72,
        firstSkillY: 255.7,
        skills: ['athletics']
    },
    {
        name: 'dexterity',
        scoreY: 337.64,
        saveOffset: -1.94,
        firstSkillY: 349.1,
        lastSkillY: 381.6,
        skills: ['acrobatics', 'sleightOfHand', 'stealth']
    },
    {
        name: 'constitution',
        scoreY: 433.69,
        saveOffset: -2.59,
        skills: []
    },
    {
        name: 'intelligence',
        scoreY: 533.37,
        saveOffset: -2.67,
        firstSkillY: 543.9,
        lastSkillY: 606.3,
        skills: ['arcana', 'history', 'investigation', 'nature', 'religion']
    },
    {
        name: 'wisdom',
        scoreY: 651.37,
        saveOffset: -2.57,
        firstSkillY: 663.3,
        lastSkillY: 724.4,
        skills: ['animalHandling', 'insight', 'medicine', 'perception', 'survival']
    },
    {
        name: 'charisma',
        scoreY: 773.82,
        saveOffset: -2.52,
        firstSkillY: 785.6,
        lastSkillY: 832.3,
        skills: ['deception', 'intimidation', 'performance', 'persuasion']
    },
] as const satisfies readonly AbilityConfig[]

/**
 * One entry of ABILITIES, with its literal name and skill list.
 */
export type Ability = typeof ABILITIES[number]

/**
 * Expertise-checkbox y of the i-th skill in a block.
 */
function skillExpertiseY(a: AbilityConfig, i: number, count: number): number {
    if (count <= 1 || a.lastSkillY === undefined) return a.firstSkillY!
    return a.firstSkillY! + (i * (a.lastSkillY - a.firstSkillY!)) / (count - 1)
}

/**
 * The three field nodes of one skill row.
 */
type SkillNodes = { expertise: InputNode; proficiency: InputNode; bonus: InputNode }

/**
 * All field nodes of one ability block, keyed by its skills.
 */
export type AbilityNodes<A extends AbilityConfig> = {
    score: InputNode
    extra: InputNode
    modifier: DerivedNode
    saveProficiency: InputNode
    saveBonus: InputNode
    skills: { [S in A['skills'][number]]: SkillNodes }
}

/**
 * A skill row: expertise + proficiency checkboxes and the bonus input.
 */
function skillNodes(id: string, expertiseY: number): SkillNodes {
    return {
        expertise: inputNode({id: `${id}Expertise`, x: 134.3, y: expertiseY, width: 4, height: 4, type: 'check'}),
        proficiency: inputNode({
            id: `${id}Proficiency`,
            x: 137,
            y: expertiseY + 2.2,
            width: 8,
            height: 8,
            type: 'check'
        }),
        bonus: inputNode({
            id: `${id}Bonus`,
            x: 149.2,
            y: expertiseY - 0.4,
            width: 16,
            height: 14,
            type: 'number',
            fontSize: 12
        }),
    }
}

/**
 * Builds all field nodes for one ability block: score, extra, derived modifier, saving throw, and skill rows.
 */
function abilityNodes<A extends AbilityConfig>(a: A): AbilityNodes<A> {
    const score = inputNode({
        id: `${a.name}Score`,
        x: 51.03,
        y: a.scoreY,
        width: 20.49,
        height: 16.1,
        type: 'number',
        fontSize: 16
    })
    const extra = inputNode({
        id: `${a.name}Extra`,
        x: 51.03,
        y: a.scoreY + 34.8,
        width: 20.49,
        height: 16.1,
        type: 'number',
        fontSize: 16
    })
    // Read-only modifier derived from this block's score and extra atoms.
    const modifier = derivedNode(
        {
            id: `${a.name}Modifier`,
            x: 70.71,
            y: a.scoreY + 4.12,
            width: 50.73,
            height: 39.86,
            type: 'number',
            fontSize: 36
        },
        (get) => {
            const rawScore = get(score.atom).trim()
            const rawExtra = get(extra.atom).trim()
            if (rawScore === '' && rawExtra === '') return ''
            const total = (rawScore === '' ? 0 : Number(rawScore)) + (rawExtra === '' ? 0 : Number(rawExtra))
            return Number.isNaN(total) ? '' : formatModifier(abilityModifier(total))
        },
    )
    const skills = Object.fromEntries(
        a.skills.map((skill, i, arr) => [skill, skillNodes(skill, skillExpertiseY(a, i, arr.length))]),
    ) as { [S in A['skills'][number]]: SkillNodes }
    return {
        score,
        extra,
        modifier,
        saveProficiency: inputNode({
            id: `${a.name}SavingThrowProficiency`, x: 136.5, y: a.scoreY + a.saveOffset,
            width: 9, height: 9, type: 'check', shape: 'diamond',
        }),
        saveBonus: inputNode({
            id: `${a.name}SavingThrowBonus`, x: 149.2, y: a.scoreY + a.saveOffset - SAVE_BONUS_GAP,
            width: 16, height: 14, type: 'number', fontSize: 12,
        }),
        skills,
    }
}

/**
 * Ability-area meta fields: proficiency bonus, inspiration, passive perception.
 */
export const abilityMeta = {
    proficiencyBonus: inputNode({
        id: 'proficiencyBonus',
        x: 44,
        y: 166.27,
        width: 40,
        height: 32,
        type: 'number',
        fontSize: 28
    }),
    inspiration: inputNode({id: 'inspiration', x: 151, y: 172, width: 11, height: 11, type: 'check'}),
    enablePassivePerceptionCalc: inputNode({
        id: 'enablePassivePerceptionCalc',
        x: 152.98,
        y: 208.17,
        width: 7.25,
        height: 9,
        type: 'check',
        shape: 'star'
    }),
    passivePerception: inputNode({
        id: 'passivePerception',
        x: 229.33,
        y: 166.27,
        width: 40,
        height: 32,
        type: 'number',
        fontSize: 28
    }),
}

/**
 * The six ability blocks' field nodes, keyed by ability name.
 */
export const abilities = Object.fromEntries(
    ABILITIES.map((a) => [a.name, abilityNodes(a)]),
) as { [A in Ability as A['name']]: AbilityNodes<A> }
