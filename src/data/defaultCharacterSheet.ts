import {ABILITY_DEFINITIONS} from './abilities'
import type {AbilityData, AbilityKey, CharacterSheetData, SkillData,} from '../types'

function createEmptySkill(): SkillData {
    return {proficient: false, bonus: ''}
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
        proficiencyBonus: '',
        passivePerception: '',
        abilities: createDefaultAbilities(),
        combat: {
            armourClass: '',
            shield: '',
            darkvision: '',
            initiative: '',
            run: '',
            climb: '',
            swim: '',
            fly: '',
            totalHp: '',
            currentHp: '',
            temporaryHp: '',
            conditions: '',
        },
        weapons: Array.from({length: 4}, () => ({
            name: '',
            attack: '',
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
        spellSlots: SPELL_LEVELS.map(() => ({total: '', used: ''})),
        spellStats: {
            spellDc: '',
            spellAttack: '',
            customStatOne: '',
            customStatTwo: '',
        },
        hitDice: [
            {total: '', used: ''},
            {total: '', used: ''},
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
