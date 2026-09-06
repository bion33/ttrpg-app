import type {AbilityKey} from '../types'

export interface AbilityDefinition {
    key: AbilityKey
    name: string
    skills: string[]
}

export const ABILITY_DEFINITIONS: AbilityDefinition[] = [
    {key: 'str', name: 'Strength', skills: ['Athletics']},
    {
        key: 'dex',
        name: 'Dexterity',
        skills: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
    },
    {key: 'con', name: 'Constitution', skills: []},
    {
        key: 'int',
        name: 'Intelligence',
        skills: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
    },
    {
        key: 'wis',
        name: 'Wisdom',
        skills: [
            'Animal Handling',
            'Insight',
            'Medicine',
            'Perception',
            'Survival',
        ],
    },
    {
        key: 'cha',
        name: 'Charisma',
        skills: ['Deception', 'Intimidation', 'Performance', 'Persuasion'],
    },
]

export function abilityModifier(score: number, bonus: number): number {
    const total = score && bonus ? score + bonus : score
    return Math.floor((total - 10) / 2)
}

export function formatModifier(modifier: number): string {
    return modifier > 0 ? `+${modifier}` : `${modifier}`
}
