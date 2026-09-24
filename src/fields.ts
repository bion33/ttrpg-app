import type {FieldDefinition} from './types/FieldDefinition.ts'

// All coordinates are in the artwork's viewBox units (see FieldDefinition).
// The many repeating regions of the sheet (ability blocks, skills, weapons,
// cantrips, spell slots, damage types) are *generated* from a single anchor
// plus a constant step, rather than transcribed row by row. To nudge a whole
// column/row, change one constant here instead of editing dozens of entries.

// ---- Layout steps (viewBox units) ----
const SAVE_BONUS_GAP = 2.5       // the saving-throw bonus input sits this far above its check
const SPELL_SLOT_X_STEP = 24.93  // horizontal gap between spell-slot columns
const WEAPON_ROW_STEP = 27       // vertical gap between weapon rows
const CANTRIP_ROW_STEP = 23.33   // vertical gap between cantrip rows
const DAMAGE_ROW_STEP = 12.67    // vertical gap between damage-type rows
const DAMAGE_COL_STEP = 6.67     // horizontal gap: immunity -> resistance -> vulnerability

// ---- Ability blocks (score / extra / modifier / saving throw + skills) ----

// The six ability blocks are NOT on one uniform vertical grid: each block's
// row pitch and saving-throw position differ slightly in the traced artwork,
// so a single global step doesn't fit. Instead each block carries its own
// real anchors - the saving-throw offset, and the first/last skill y - and
// intermediate skill rows are interpolated between those two endpoints. This
// keeps both endpoints exact and holds the middle rows to sub-unit error.
type AbilityConfig = {
    name: string
    scoreY: number       // y of the ability-score box; score/extra/modifier are relative to it
    saveOffset: number   // saving-throw check y, relative to scoreY (varies per block)
    skills: string[]
    firstSkillY?: number // expertise-checkbox y of the first skill
    lastSkillY?: number  // expertise-checkbox y of the last skill (interpolation endpoint)
}

const ABILITIES: AbilityConfig[] = [
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
]

// Expertise-checkbox y of the i-th skill, linearly interpolated between the
// block's first and last skill anchors (both endpoints land exactly).
function skillExpertiseY(a: AbilityConfig, i: number, count: number): number {
    if (count <= 1 || a.lastSkillY === undefined) return a.firstSkillY!
    return a.firstSkillY! + (i * (a.lastSkillY - a.firstSkillY!)) / (count - 1)
}

// A skill row: expertise + proficiency checkboxes and the bonus input, at
// fixed offsets from the row's expertise-checkbox y.
function skillRow(id: string, expertiseY: number): FieldDefinition[] {
    return [
        {id: `${id}Expertise`, x: 134.3, y: expertiseY, width: 4, height: 4, type: 'check'},
        {id: `${id}Proficiency`, x: 137, y: expertiseY + 2.2, width: 8, height: 8, type: 'check'},
        {id: `${id}Bonus`, x: 149.2, y: expertiseY - 0.4, width: 16, height: 14, type: 'number', fontSize: 12},
    ]
}

function abilityBlock(a: AbilityConfig): FieldDefinition[] {
    return [
        {id: `${a.name}Score`, x: 51.03, y: a.scoreY, width: 20.49, height: 16.1, type: 'number', fontSize: 16},
        {id: `${a.name}Extra`, x: 51.03, y: a.scoreY + 34.8, width: 20.49, height: 16.1, type: 'number', fontSize: 16},
        {
            id: `${a.name}Modifier`,
            x: 70.71,
            y: a.scoreY + 4.12,
            width: 50.73,
            height: 39.86,
            type: 'number',
            fontSize: 36
        },
        {
            id: `${a.name}SavingThrowProficiency`,
            x: 136.5,
            y: a.scoreY + a.saveOffset,
            width: 9,
            height: 9,
            type: 'check',
            shape: 'diamond'
        },
        {
            id: `${a.name}SavingThrowBonus`,
            x: 149.2,
            y: a.scoreY + a.saveOffset - SAVE_BONUS_GAP,
            width: 16,
            height: 14,
            type: 'number',
            fontSize: 12
        },
        ...a.skills.flatMap((skill, i, arr) => skillRow(skill, skillExpertiseY(a, i, arr.length))),
    ]
}

// ---- Generic number grid ----

// Places number fields on a grid: ids[row][col] sits at
// (x0 + col*colStep, y0 + row*rowStep). Used for the speed and hit-dice boxes.
function numberGrid(
    ids: string[][],
    opts: {x0: number; y0: number; colStep: number; rowStep: number; width: number; height: number; fontSize: number},
): FieldDefinition[] {
    return ids.flatMap((cols, row) =>
        cols.map((id, col) => ({
            id,
            x: opts.x0 + col * opts.colStep,
            y: opts.y0 + row * opts.rowStep,
            width: opts.width,
            height: opts.height,
            type: 'number' as const,
            fontSize: opts.fontSize,
        })),
    )
}

// ---- Weapons ----

function weaponRow(n: number): FieldDefinition[] {
    const dy = (n - 1) * WEAPON_ROW_STEP
    return [
        {id: `weaponName${n}`, x: 301, y: 456 + dy, width: 99, height: 16, type: 'text', fontSize: 12},
        {id: `weaponAttack${n}`, x: 406.2, y: 454.88 + dy, width: 24, height: 18, type: 'number', fontSize: 12},
        {id: `weaponDamage${n}`, x: 435, y: 456 + dy, width: 73, height: 16, type: 'text', fontSize: 12},
        {id: `weaponSlashing${n}`, x: 511.2, y: 455.73 + dy, width: 4.67, height: 4.67, type: 'check'},
        {id: `weaponPiercing${n}`, x: 511.2, y: 461.73 + dy, width: 4.67, height: 4.67, type: 'check'},
        {id: `weaponBludgeoning${n}`, x: 511.2, y: 467.6 + dy, width: 4.67, height: 4.67, type: 'check'},
    ]
}

// ---- Cantrips ----

function cantripRow(n: number): FieldDefinition[] {
    const dy = (n - 1) * CANTRIP_ROW_STEP
    return [
        {id: `cantripPrepared${n}`, x: 290.4, y: 577.07 + dy, width: 4.67, height: 4.67, type: 'check'},
        {id: `cantripName${n}`, x: 302, y: 569.07 + dy, width: 92, height: 16, type: 'text', fontSize: 12},
        {id: `cantripEffect${n}`, x: 408, y: 569.07 + dy, width: 100, height: 16, type: 'text', fontSize: 12},
        {id: `cantripSomatic${n}`, x: 510.3, y: 568.4 + dy, width: 4.67, height: 4.67, type: 'check', shape: 'diamond'},
        {id: `cantripVerbal${n}`, x: 510.3, y: 574.3 + dy, width: 4.67, height: 4.67, type: 'check', shape: 'diamond'},
        {
            id: `cantripMaterial${n}`,
            x: 510.3,
            y: 580.1 + dy,
            width: 4.67,
            height: 4.67,
            type: 'check',
            shape: 'diamond'
        },
    ]
}

// ---- Spell slots (one column per spell level) ----

function spellSlotColumn(n: number): FieldDefinition[] {
    const x = 302.7 + (n - 1) * SPELL_SLOT_X_STEP
    return [
        {id: `totalSpellSlots${n}`, x, y: 733, width: 12, height: 16, type: 'number', fontSize: 14},
        {id: `usedSpellSlots${n}`, x, y: 757, width: 12, height: 18, type: 'number', fontSize: 14},
    ]
}

// ---- Damage types (immunity / resistance / vulnerability grid) ----

type DamageBlock = { x: number; types: string[] }

const DAMAGE_BLOCK_Y = 271.73
const DAMAGE_BLOCKS: DamageBlock[] = [
    {x: 560.67, types: ['bludgeoning', 'piercing', 'slashing', 'cold', 'fire']},
    {x: 628.53, types: ['poison', 'acid', 'psychic', 'necrotic']},
    {x: 697.87, types: ['radiant', 'lightning', 'thunder', 'force']},
]

const DAMAGE_LEVELS: { suffix: string; color: FieldDefinition['color'] }[] = [
    {suffix: 'Immunity', color: 'green'},
    {suffix: 'Resistance', color: 'goldenrod'},
    {suffix: 'Vulnerability', color: 'firebrick'},
]

function damageTypeRow(type: string, blockX: number, y: number): FieldDefinition[] {
    return DAMAGE_LEVELS.map((lvl, col) => ({
        id: `${type}${lvl.suffix}`,
        x: blockX + col * DAMAGE_COL_STEP,
        y,
        width: 6,
        height: 6,
        type: 'check' as const,
        color: lvl.color,
    }))
}

function damageBlock(block: DamageBlock): FieldDefinition[] {
    return block.types.flatMap((type, row) =>
        damageTypeRow(type, block.x, DAMAGE_BLOCK_Y + row * DAMAGE_ROW_STEP),
    )
}

// ---- Assembled field list ----

export const Fields: FieldDefinition[] = [
    // === HEADER === //
    {id: 'characterName', x: 88, y: 82, width: 230, height: 28, type: 'text', fontSize: 24, textAlign: 'center'},
    {id: 'class', x: 360, y: 64, width: 118, height: 22, type: 'text', fontSize: 18},
    {id: 'level', x: 482, y: 64, width: 24, height: 22, type: 'text', fontSize: 18, textAlign: 'center'},
    {id: 'background', x: 510, y: 64, width: 122, height: 22, type: 'text', fontSize: 18},
    {id: 'playerName', x: 639, y: 64, width: 116, height: 22, type: 'text', fontSize: 18},
    {id: 'race', x: 360, y: 98, width: 118, height: 22, type: 'text', fontSize: 18},
    {id: 'size', x: 482, y: 98, width: 24, height: 22, type: 'text', fontSize: 18, textAlign: 'center'},
    {id: 'alignment', x: 510, y: 98, width: 122, height: 22, type: 'text', fontSize: 18},
    {id: 'experiencePoints', x: 639.1, y: 98, width: 116, height: 22, type: 'text', fontSize: 18},

    // === ABILITIES === //
    {id: 'proficiencyBonus', x: 44, y: 166.27, width: 40, height: 32, type: 'number', fontSize: 28},
    {id: 'inspiration', x: 151, y: 172, width: 11, height: 11, type: 'check'},
    {id: 'enablePassivePerceptionCalc', x: 152.98, y: 208.17, width: 7.25, height: 9, type: 'check', shape: 'star'},
    {id: 'passivePerception', x: 229.33, y: 166.27, width: 40, height: 32, type: 'number', fontSize: 28},
    ...ABILITIES.flatMap(abilityBlock),

    // === COMBAT STATS === //
    {id: 'armorClass', x: 308, y: 206, width: 42, height: 32, type: 'number', fontSize: 28},
    {id: 'darkvision', x: 392, y: 172, width: 26, height: 16, type: 'number', fontSize: 14},
    {id: 'initiative', x: 380, y: 206, width: 50, height: 32, type: 'number', fontSize: 28},
    {id: 'enableSpeedCalc', x: 480.01, y: 180.05, width: 7.25, height: 9, type: 'check', shape: 'star'},
    ...numberGrid(
        [
            ['runSpeed', 'climbSpeed'],
            ['swimSpeed', 'flySpeed']
        ],
        {x0: 458, y0: 202, colStep: 24, rowStep: 20, width: 26, height: 18, fontSize: 16},
    ),
    {id: 'maxHitPoints', x: 387, y: 252, width: 36, height: 24, type: 'number', fontSize: 22},
    {id: 'temporaryHitPoints', x: 434, y: 265, width: 68.79, height: 18, type: 'number', fontSize: 16},
    {id: 'currentHitPoints', x: 350, y: 292, width: 110, height: 36, type: 'number', fontSize: 32},
    {id: 'buffsDebuffsConditions', x: 305, y: 350, width: 210, height: 56, type: 'textarea', fontSize: 12},

    // === WEAPONS, CANTRIPS & SPELLS === //
    ...[1, 2, 3, 4].flatMap(weaponRow),
    ...[1, 2, 3, 4, 5, 6].flatMap(cantripRow),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(spellSlotColumn),

    {id: 'spellSaveDC', x: 296, y: 806, width: 52, height: 30, type: 'number', fontSize: 28},
    {id: 'spellAttackBonus', x: 352, y: 806, width: 52, height: 30, type: 'number', fontSize: 28},
    {id: 'customStat1', x: 411, y: 806, width: 52, height: 30, type: 'number', fontSize: 28},
    {id: 'customStat2', x: 469, y: 806, width: 52, height: 30, type: 'number', fontSize: 28},
    // Custom Stats labels (top title + one under each input)
    {id: 'customStatTitle', x: 439, y: 782.5, width: 52, height: 15, type: 'text', fontSize: 12, textAlign: 'center'},
    {id: 'customStat1Label', x: 417, y: 842, width: 40, height: 14, type: 'text', fontSize: 8, textAlign: 'center'},
    {id: 'customStat2Label', x: 475, y: 842, width: 40, height: 14, type: 'text', fontSize: 8, textAlign: 'center'},

    // === NOTES === //
    {id: 'notes', x: 44, y: 878, width: 476, height: 154, type: 'textarea', fontSize: 12},

    // === HIT DICE & DEATH SAVES === //
    {id: 'hitDiceClass1', x: 562, y: 210, width: 14, height: 20, type: 'number', fontSize: 12},
    ...numberGrid(
        [
            ['hitDiceTotalClass1', 'hitDiceTotalClass2'],
            ['hitDiceUsedClass1', 'hitDiceUsedClass2']
        ],
        {x0: 578, y0: 202, colStep: 24, rowStep: 20, width: 26, height: 18, fontSize: 16},
    ),
    {id: 'hitDiceClass2', x: 635, y: 210, width: 14, height: 20, type: 'number', fontSize: 12},

    {id: 'deathSaveFailure1', x: 678.27, y: 193.47, width: 11, height: 11, type: 'check'},
    {id: 'deathSaveFailure2', x: 670.8, y: 211.2, width: 11, height: 11, type: 'check'},
    {id: 'deathSaveFailure3', x: 678.27, y: 228.8, width: 11, height: 11, type: 'check'},
    {id: 'deathSaveSuccess1', x: 743.33, y: 193.47, width: 11, height: 11, type: 'check'},
    {id: 'deathSaveSuccess2', x: 750.93, y: 211.2, width: 11, height: 11, type: 'check'},
    {id: 'deathSaveSuccess3', x: 743.33, y: 228.8, width: 11, height: 11, type: 'check'},

    // === DAMAGE TYPES === //
    ...DAMAGE_BLOCKS.flatMap(damageBlock),

    // === OTHER PROFICIENCIES, FEATURES & TRAITS === //
    {id: 'languages', x: 548, y: 364, width: 224, height: 50, type: 'textarea', fontSize: 12},
    {id: 'weapons', x: 594, y: 417, width: 177, height: 12, type: 'text', fontSize: 12},
    {id: 'armor', x: 583, y: 432, width: 187, height: 12, type: 'text', fontSize: 12},
    {id: 'tools', x: 579, y: 447, width: 191, height: 12, type: 'text', fontSize: 12},
    {id: 'advantages', x: 548, y: 474, width: 224, height: 12, type: 'text', fontSize: 12},
    {id: 'disadvantages', x: 548, y: 500, width: 224, height: 12, type: 'text', fontSize: 12},
    {id: 'featuresAndTraits', x: 548, y: 528, width: 224, height: 504, type: 'textarea', fontSize: 12},
]