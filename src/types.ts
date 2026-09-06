export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface SkillData {
    proficient: boolean
    bonus: string
}

export interface AbilityData {
    score: number
    scoreBonus: number
    save: SkillData
    skills: Record<string, SkillData>
}

export interface Weapon {
    name: string
    attack: string
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
    total: string
    used: string
}

export interface HitDiceTrack {
    total: string
    used: string
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
    armourClass: string
    shield: string
    darkvision: string
    initiative: string
    run: string
    climb: string
    swim: string
    fly: string
    totalHp: string
    currentHp: string
    temporaryHp: string
    conditions: string
}

export interface SpellStatsData {
    spellDc: string
    spellAttack: string
    customStatOne: string
    customStatTwo: string
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
