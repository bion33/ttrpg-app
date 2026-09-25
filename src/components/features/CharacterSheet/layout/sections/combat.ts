import {numberGrid} from '../../../../../lib/fieldNodes.ts'
import {inputNode} from '../nodes.ts'

/**
 * Combat fields: armor class, speeds, hit points, and conditions.
 */
export const combat = {
    armorClass: inputNode({id: 'armorClass', x: 308, y: 206, width: 42, height: 32, type: 'number', fontSize: 28}),
    darkvision: inputNode({id: 'darkvision', x: 392, y: 172, width: 26, height: 16, type: 'number', fontSize: 14}),
    initiative: inputNode({id: 'initiative', x: 380, y: 206, width: 50, height: 32, type: 'number', fontSize: 28}),
    enableSpeedCalc: inputNode({
        id: 'enableSpeedCalc',
        x: 480.01,
        y: 180.05,
        width: 7.25,
        height: 9,
        type: 'check',
        shape: 'star'
    }),
    speed: numberGrid(
        inputNode,
        [
            ['runSpeed', 'climbSpeed'],
            ['swimSpeed', 'flySpeed'],
        ],
        {x0: 458, y0: 202, colStep: 24, rowStep: 20, width: 26, height: 18, fontSize: 16},
    ),
    maxHitPoints: inputNode({id: 'maxHitPoints', x: 387, y: 252, width: 36, height: 24, type: 'number', fontSize: 22}),
    temporaryHitPoints: inputNode({
        id: 'temporaryHitPoints',
        x: 434,
        y: 265,
        width: 68.79,
        height: 18,
        type: 'number',
        fontSize: 16
    }),
    currentHitPoints: inputNode({
        id: 'currentHitPoints',
        x: 350,
        y: 292,
        width: 110,
        height: 36,
        type: 'number',
        fontSize: 32
    }),
    buffsDebuffsConditions: inputNode({
        id: 'buffsDebuffsConditions',
        x: 305,
        y: 350,
        width: 210,
        height: 56,
        type: 'textarea',
        fontSize: 12
    }),
}

/**
 * Hit-dice fields: die type and total/used counts per class.
 */
export const hitDice = {
    class1: inputNode({id: 'hitDiceClass1', x: 562, y: 210, width: 14, height: 20, type: 'number', fontSize: 12}),
    counts: numberGrid(
        inputNode,
        [
            ['hitDiceTotalClass1', 'hitDiceTotalClass2'],
            ['hitDiceUsedClass1', 'hitDiceUsedClass2'],
        ],
        {x0: 578, y0: 202, colStep: 24, rowStep: 20, width: 26, height: 18, fontSize: 16},
    ),
    class2: inputNode({id: 'hitDiceClass2', x: 635, y: 210, width: 14, height: 20, type: 'number', fontSize: 12}),
}

/**
 * Death-save fields: three success and three failure checkboxes.
 */
export const deathSaves = {
    failure1: inputNode({id: 'deathSaveFailure1', x: 678.27, y: 193.47, width: 11, height: 11, type: 'check'}),
    failure2: inputNode({id: 'deathSaveFailure2', x: 670.8, y: 211.2, width: 11, height: 11, type: 'check'}),
    failure3: inputNode({id: 'deathSaveFailure3', x: 678.27, y: 228.8, width: 11, height: 11, type: 'check'}),
    success1: inputNode({id: 'deathSaveSuccess1', x: 743.33, y: 193.47, width: 11, height: 11, type: 'check'}),
    success2: inputNode({id: 'deathSaveSuccess2', x: 750.93, y: 211.2, width: 11, height: 11, type: 'check'}),
    success3: inputNode({id: 'deathSaveSuccess3', x: 743.33, y: 228.8, width: 11, height: 11, type: 'check'}),
}
