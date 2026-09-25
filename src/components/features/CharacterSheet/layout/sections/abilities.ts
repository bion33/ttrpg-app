import type {Getter} from 'jotai'
import type {DerivedNode, InputNode} from '../../../../../types/FieldNode.ts'
import {abilityModifier, formatModifier, skillBonus} from '../../logic/formulas.ts'
import {derivedNode, inputNode} from '../nodes.ts'

import type {CheckFieldDefinition} from "../../../../../types/CheckFieldDefinition.ts";

// ---- INTERNAL CONSTANTS ----

/**
 * The six ability blocks and their skills.
 */
const ABILITIES = [
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

// ---- INTERNAL TYPES ----

/**
 * The three field nodes of one skill row; the bonus is derived from the ability modifier and its checkboxes.
 */
type SkillNodes = { expertise: InputNode; proficiency: InputNode; bonus: DerivedNode }

// ---- EXPORTED TYPES ----

/**
 * One entry of ABILITIES, with its literal name and skill list.
 */
export type Ability = typeof ABILITIES[number]

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
 * All field nodes of one ability block, keyed by its skills.
 */
export type AbilityNodes<A extends AbilityConfig> = {
    score: InputNode
    extra: InputNode
    modifier: DerivedNode
    saveProficiency: InputNode
    saveBonus: DerivedNode
    skills: { [S in A['skills'][number]]: SkillNodes }
}

// ---- EXPORTED CONSTANTS ----

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
        shape: 'star',
        defaultValue: true
    } as CheckFieldDefinition),
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

// ---- PRIVATE FUNCTIONS ----

/**
 * Builds all field nodes for one ability block: score, extra, derived modifier, saving throw, and skill rows.
 */
function abilityNodes<A extends AbilityConfig>(a: A): AbilityNodes<A> {
    // The ability base score
    const score = inputNode({
        id: `${a.name}Score`,
        x: 51.03,
        y: a.scoreY,
        width: 20.49,
        height: 16.1,
        type: 'number',
        fontSize: 16
    })

    // Extra ability score points to add
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
            const modifier = abilityModifierValue(get, score, extra)
            return modifier === null ? '' : formatModifier(modifier)
        },
    )

    const saveProficiency = inputNode({
        id: `${a.name}SavingThrowProficiency`, x: 136.5, y: a.scoreY + a.saveOffset,
        width: 9, height: 9, type: 'check', shape: 'diamond',
    } as CheckFieldDefinition)

    // the saving-throw bonus input sits this far above its check
    const SAVE_BONUS_GAP = 2.5

    // A saving throw is the ability modifier plus the proficiency bonus when proficient (no expertise).
    const saveBonus = derivedNode(
        {
            id: `${a.name}SavingThrowBonus`, x: 149.2, y: a.scoreY + a.saveOffset - SAVE_BONUS_GAP,
            width: 16, height: 14, type: 'number', fontSize: 12,
        },
        (get) => {
            const modifierValue = abilityModifierValue(get, score, extra)
            if (modifierValue === null) return ''
            const rawProfBonus = get(abilityMeta.proficiencyBonus.atom).trim()
            const profBonus = rawProfBonus === '' ? 0 : Number(rawProfBonus)
            if (Number.isNaN(profBonus)) return ''
            const proficient = get(saveProficiency.atom) === 'true'
            return formatModifier(skillBonus(modifierValue, profBonus, proficient, false))
        },
    )

    const skills = Object.fromEntries(
        a.skills.map(
            (skill, i, arr) => [
                skill,
                skillNodes(skill, skillExpertiseY(a, i, arr.length), score, extra)
            ]
        ),
    ) as { [S in A['skills'][number]]: SkillNodes }

    return {score, extra, modifier, saveProficiency, saveBonus, skills}
}

/**
 * Numeric ability modifier from a block's score and extra atoms, or null when the score is blank.
 */
function abilityModifierValue(get: Getter, score: InputNode, extra: InputNode): number | null {
    const rawScore = get(score.atom).trim()
    const rawExtra = get(extra.atom).trim()
    if (rawScore === '' && rawExtra === '') return null
    const total = (rawScore === '' ? 0 : Number(rawScore)) + (rawExtra === '' ? 0 : Number(rawExtra))
    return Number.isNaN(total) ? null : abilityModifier(total)
}

/**
 * A skill row: expertise + proficiency checkboxes and the derived bonus.
 */
function skillNodes(id: string, expertiseY: number, score: InputNode, extra: InputNode): SkillNodes {
    const expertise = inputNode({id: `${id}Expertise`, x: 134.3, y: expertiseY, width: 4, height: 4, type: 'check'})
    const proficiency = inputNode({
        id: `${id}Proficiency`,
        x: 137,
        y: expertiseY + 2.2,
        width: 8,
        height: 8,
        type: 'check'
    })
    // Bonus = ability modifier, plus the proficiency bonus once (proficient) or twice (expertise).
    const bonus = derivedNode(
        {id: `${id}Bonus`, x: 149.2, y: expertiseY - 0.4, width: 16, height: 14, type: 'number', fontSize: 12},
        (get) => {
            const modifier = abilityModifierValue(get, score, extra)
            if (modifier === null) return ''
            const rawProfBonus = get(abilityMeta.proficiencyBonus.atom).trim()
            const profBonus = rawProfBonus === '' ? 0 : Number(rawProfBonus)
            if (Number.isNaN(profBonus)) return ''
            const proficient = get(proficiency.atom) === 'true'
            const expert = get(expertise.atom) === 'true'
            return formatModifier(skillBonus(modifier, profBonus, proficient, expert))
        },
    )
    return {expertise, proficiency, bonus}
}

/**
 * Expertise-checkbox y of the i-th skill in a block.
 */
function skillExpertiseY(a: AbilityConfig, i: number, count: number): number {
    if (count <= 1 || a.lastSkillY === undefined) return a.firstSkillY!
    return a.firstSkillY! + (i * (a.lastSkillY - a.firstSkillY!)) / (count - 1)
}
