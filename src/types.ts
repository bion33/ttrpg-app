export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface SkillData {
    proficient: boolean
    expertise: boolean
}

export interface AbilityData {
    score: number
    scoreBonus: number
    save: SkillData
    skills: Record<string, SkillData>
}

export interface Weapon {
    name: string
    attack: number
    damage: string
    slash: boolean
    pierce: boolean
    blunt: boolean
}

export interface Spell {
    prepared: boolean
    name: string
    details: string
    somatic: boolean
    verbal: boolean
    material: boolean
}

export interface SpellSlot {
    total: number
    used: number
}

export interface HitDiceTrack {
    total: number
    used: number
}

export interface DeathSaves {
    failures: [boolean, boolean, boolean]
    successes: [boolean, boolean, boolean]
}

export interface OverviewData {
    characterName: string
    classAndLevel: string
    background: string
    playerName: string
    raceAndSize: string
    alignment: string
    experiencePoints: string
}

export interface CombatData {
    armourClass: number
    shield: number
    darkvision: number
    initiative: number
    run: number
    climb: number
    swim: number
    fly: number
    halveClimbSwim: boolean
    totalHp: number
    currentHp: number
    temporaryHp: number
    conditions: string
}

export interface SpellStatsData {
    spellDc: number
    spellAttack: number
    customStatOne: number
    customStatTwo: number
}

export interface ProficienciesData {
    languages: string
    weaponProficiencies: string
    armourProficiencies: string
    toolProficiencies: string
    advantages: string
    disadvantages: string
}

export interface CharacterSheetData {
    overview: OverviewData
    proficiencyBonus: number
    abilities: Record<AbilityKey, AbilityData>
    combat: CombatData
    weapons: Weapon[]
    spells: Spell[]
    spellSlots: SpellSlot[]
    spellStats: SpellStatsData
    hitDice: [HitDiceTrack, HitDiceTrack]
    deathSaves: DeathSaves
    resistances: string
    proficiencies: ProficienciesData
    features: string
    notes: string
}
