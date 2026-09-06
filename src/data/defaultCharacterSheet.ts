import {ABILITY_DEFINITIONS} from './abilities'
import type {AbilityData, AbilityKey, CharacterSheetData, SkillData,} from '../types'

function createEmptySkill(): SkillData {
    return {proficient: false, expertise: false}
}

function createDefaultAbilities(): Record<AbilityKey, AbilityData> {
    return ABILITY_DEFINITIONS.reduce(
        (abilities, definition) => {
            abilities[definition.key] = {
                score: 10,
                scoreBonus: 0,
                save: createEmptySkill(),
                skills: Object.fromEntries(
                    definition.skills.map((skill) => [skill, createEmptySkill()]),
                ),
            }
            return abilities
        },
        {} as Record<AbilityKey, AbilityData>,
    )
}

export const SPELL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function createDefaultCharacterSheet(): CharacterSheetData {
    return {
        overview: {
            characterName: '',
            classAndLevel: '',
            background: '',
            playerName: '',
            raceAndSize: '',
            alignment: '',
            experiencePoints: '',
        },
        proficiencyBonus: 0,
        passivePerception: 0,
        abilities: createDefaultAbilities(),
        combat: {
            armourClass: 0,
            shield: 0,
            darkvision: 0,
            initiative: 0,
            run: 0,
            climb: 0,
            swim: 0,
            fly: 0,
            totalHp: 0,
            currentHp: 0,
            temporaryHp: 0,
            conditions: '',
        },
        weapons: Array.from({length: 4}, () => ({
            name: '',
            attack: 0,
            damage: '',
            slash: false,
            pierce: false,
            blunt: false,
        })),
        spells: Array.from({length: 6}, () => ({
            prepared: false,
            name: '',
            details: '',
            somatic: false,
            verbal: false,
            material: false,
        })),
        spellSlots: SPELL_LEVELS.map(() => ({total: 0, used: 0})),
        spellStats: {
            spellDc: 0,
            spellAttack: 0,
            customStatOne: 0,
            customStatTwo: 0,
        },
        hitDice: [
            {total: 0, used: 0},
            {total: 0, used: 0},
        ],
        deathSaves: {
            failures: [false, false, false],
            successes: [false, false, false],
        },
        resistances: '',
        proficiencies: {
            languages: '',
            weaponProficiencies: '',
            armourProficiencies: '',
            toolProficiencies: '',
            advantages: '',
            disadvantages: '',
        },
        features: '',
        notes: '',
    }
}
