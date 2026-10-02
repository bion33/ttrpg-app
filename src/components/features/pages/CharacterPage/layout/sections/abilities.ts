import type {Getter} from 'jotai'
import type {DerivedNode, InputNode} from '@type/FieldNode.ts'
import type {NumericFieldDefinition} from '@type/NumericFieldDefinition.ts'
import {abilityModifier, passivePerception, skillBonus} from '@pages/CharacterPage/logic/formulas/formulas.ts'
import type {SheetFactory} from '@pages/CharacterPage/layout/nodes.ts'

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
type SkillNodes = { expertise: InputNode<boolean>; proficiency: InputNode<boolean>; bonus: DerivedNode<number | null> }

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
    score: InputNode<number | null>
    extra: InputNode<number | null>
    modifier: DerivedNode<number | null>
    saveProficiency: InputNode<boolean>
    saveBonus: DerivedNode<number | null>
    skills: { [S in A['skills'][number]]: SkillNodes }
}

/**
 * The ability-area meta fields (proficiency bonus, inspiration, passive perception) and the six ability blocks.
 */
export type AbilitiesSection = {
    abilityMeta: {
        proficiencyBonus: InputNode<number | null>
        inspiration: InputNode<boolean>
        enablePassivePerceptionCalculation: InputNode<boolean>
        passivePerception: InputNode<number | null>
    }
    abilities: { [A in Ability as A['name']]: AbilityNodes<A> }
}

// ---- EXPORTED FUNCTIONS ----

/**
 * Builds the ability-block fields and their meta fields; the passive-perception and saving-throw derivations wire
 * the two together, so they are created in one factory-bound scope.
 */
export function buildAbilities(factory: SheetFactory): AbilitiesSection {
    const {inputNode, checkNode, computedInputNode, derivedNode} = factory

    // Toggle for the passive-perception auto-calculation; when checked, passive Perception is derived.
    const enablePassivePerceptionCalculation = checkNode({
        id: 'enablePassivePerceptionCalculation',
        x: 152.98,
        y: 208.17,
        width: 7.25,
        height: 9,
        type: 'check',
        shape: 'star',
        defaultValue: true
    })

    const abilities = Object.fromEntries(
        ABILITIES.map((ability) => [ability.name, abilityNodes(ability)]),
    ) as { [A in Ability as A['name']]: AbilityNodes<A> }

    const abilityMeta = {
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
        enablePassivePerceptionCalculation,
        passivePerception: computedInputNode(
            {
                id: 'passivePerception',
                x: 229.33,
                y: 166.27,
                width: 40,
                height: 32,
                type: 'number',
                fontSize: 28
            },
            enablePassivePerceptionCalculation.atom,
            (get) => {
                const bonus = get(abilities.wisdom.skills.perception.bonus.atom)
                return bonus === null ? null : passivePerception(bonus)
            },
        ),
    }

    return {abilityMeta, abilities}

    // The proficiency-bonus value, defaulting to 0 when its field is blank.
    function proficiencyBonusValue(get: Getter): number {
        return get(abilityMeta.proficiencyBonus.atom) ?? 0
    }

    // Builds all field nodes for one ability block: score, extra, derived modifier, saving throw, and skill rows.
    function abilityNodes<A extends AbilityConfig>(ability: A): AbilityNodes<A> {
        // The ability base score
        const score = inputNode({
            id: `${ability.name}Score`,
            x: 51.03,
            y: ability.scoreY,
            width: 20.49,
            height: 16.1,
            type: 'number',
            fontSize: 16
        })

        // Extra ability score points to add
        const extra = inputNode({
            id: `${ability.name}Extra`,
            x: 51.03,
            y: ability.scoreY + 34.8,
            width: 20.49,
            height: 16.1,
            type: 'number',
            fontSize: 16
        })

        // Read-only modifier derived from this block's score and extra atoms.
        const modifier = derivedNode<number | null>(
            {
                id: `${ability.name}Modifier`,
                x: 70.71,
                y: ability.scoreY + 4.12,
                width: 50.73,
                height: 39.86,
                type: 'number',
                fontSize: 36,
                signed: true,
            } as NumericFieldDefinition,
            (get) => abilityModifierValue(get, score, extra),
        )

        const saveProficiency = checkNode({
            id: `${ability.name}SavingThrowProficiency`, x: 136.5, y: ability.scoreY + ability.saveOffset,
            width: 9, height: 9, type: 'check', shape: 'diamond',
        })

        // the saving-throw bonus input sits this far above its check
        const SAVE_BONUS_GAP = 2.5

        // A saving throw is the ability modifier plus the proficiency bonus when proficient (no expertise).
        const saveBonus = derivedNode<number | null>(
            {
                id: `${ability.name}SavingThrowBonus`,
                x: 149.2,
                y: ability.scoreY + ability.saveOffset - SAVE_BONUS_GAP,
                width: 16,
                height: 14,
                type: 'number',
                fontSize: 12,
                signed: true,
            } as NumericFieldDefinition,
            (get) => {
                const modifierValue = abilityModifierValue(get, score, extra)
                if (modifierValue === null) return null
                const proficient = get(saveProficiency.atom)
                return skillBonus(modifierValue, proficiencyBonusValue(get), proficient, false)
            },
        )

        const skills = Object.fromEntries(
            ability.skills.map(
                (skill, index, all) => [
                    skill,
                    skillNodes(skill, skillExpertiseY(ability, index, all.length), score, extra)
                ]
            ),
        ) as { [S in A['skills'][number]]: SkillNodes }

        return {score, extra, modifier, saveProficiency, saveBonus, skills}
    }

    // A skill row: expertise + proficiency checkboxes and the derived bonus.
    function skillNodes(id: string, expertiseY: number, score: InputNode<number | null>, extra: InputNode<number | null>): SkillNodes {
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
        const bonus = derivedNode<number | null>(
            {
                id: `${id}Bonus`,
                x: 149.2,
                y: expertiseY - 0.4,
                width: 16,
                height: 14,
                type: 'number',
                fontSize: 12,
                signed: true,
            } as NumericFieldDefinition,
            (get) => {
                const modifier = abilityModifierValue(get, score, extra)
                if (modifier === null) return null
                const proficient = get(proficiency.atom)
                const expert = get(expertise.atom)
                return skillBonus(modifier, proficiencyBonusValue(get), proficient, expert)
            },
        )
        return {expertise, proficiency, bonus}
    }
}

// ---- PRIVATE FUNCTIONS ----

/**
 * Numeric ability modifier from a block's score and extra atoms, or null when the score is blank.
 */
function abilityModifierValue(get: Getter, score: InputNode<number | null>, extra: InputNode<number | null>): number | null {
    const scoreValue = get(score.atom)
    const extraValue = get(extra.atom)
    if (scoreValue === null && extraValue === null) return null
    return abilityModifier((scoreValue ?? 0) + (extraValue ?? 0))
}

/**
 * Expertise-checkbox y of the skill at the given index in a block.
 */
function skillExpertiseY(ability: AbilityConfig, index: number, count: number): number {
    if (count <= 1 || ability.lastSkillY === undefined) return ability.firstSkillY!
    return ability.firstSkillY! + (index * (ability.lastSkillY - ability.firstSkillY!)) / (count - 1)
}
