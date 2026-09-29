import type {Getter} from 'jotai'
import {halfSpeed} from '../../logic/formulas.ts'
import type {SheetFactory} from '../nodes.ts'

/**
 * Builds the combat fields (armor class, speeds, hit points, conditions), the hit-dice block, and the death saves.
 */
export function buildCombat({inputNode, checkNode, computedInputNode}: SheetFactory) {
    // Toggle for the climb/swim speed auto-calculation; when checked, both are derived from run speed.
    const enableSpeedCalculation = checkNode({
        id: 'enableSpeedCalculation',
        x: 480.01,
        y: 180.05,
        width: 7.25,
        height: 9,
        type: 'check',
        shape: 'star',
        defaultValue: true
    })

    // The walking speed both climb and swim are derived from when auto-calc is on.
    const runSpeed = inputNode({id: 'runSpeed', x: 458, y: 202, width: 26, height: 18, type: 'number', fontSize: 16})

    // Climb/swim = half the walking speed while auto-calc is on, an editable input otherwise.
    function halfRunSpeed(get: Getter): number | null {
        const value = get(runSpeed.atom)
        return value === null ? null : halfSpeed(value)
    }

    const combat = {
        armorClass: inputNode({id: 'armorClass', x: 308, y: 206, width: 42, height: 32, type: 'number', fontSize: 28}),
        shield: checkNode(
            {
                id: 'shield',
                x: 342.5,
                y: 234.5,
                width: 14,
                height: 14,
                type: 'check',
                shape: 'diamond'
            }
        ),
        darkvision: inputNode({id: 'darkvision', x: 392, y: 172, width: 26, height: 16, type: 'number', fontSize: 14}),
        initiative: inputNode({id: 'initiative', x: 380, y: 206, width: 50, height: 32, type: 'number', fontSize: 28}),
        enableSpeedCalculation,
        speed: {
            runSpeed,
            climbSpeed: computedInputNode(
                {id: 'climbSpeed', x: 482, y: 202, width: 26, height: 18, type: 'number', fontSize: 16},
                enableSpeedCalculation.atom,
                halfRunSpeed,
            ),
            swimSpeed: computedInputNode(
                {id: 'swimSpeed', x: 458, y: 222, width: 26, height: 18, type: 'number', fontSize: 16},
                enableSpeedCalculation.atom,
                halfRunSpeed,
            ),
            flySpeed: inputNode({id: 'flySpeed', x: 482, y: 222, width: 26, height: 18, type: 'number', fontSize: 16}),
        },
        maxHitPoints: inputNode({
            id: 'maxHitPoints',
            x: 387,
            y: 252,
            width: 36,
            height: 24,
            type: 'number',
            fontSize: 22
        }),
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

    const hitDice = {
        class1: inputNode({id: 'hitDiceClass1', x: 562, y: 210, width: 14, height: 20, type: 'number', fontSize: 12}),
        totalClass1: inputNode({id: 'hitDiceTotalClass1', x: 578, y: 202, width: 26, height: 18, type: 'number', fontSize: 16}),
        totalClass2: inputNode({id: 'hitDiceTotalClass2', x: 602, y: 202, width: 26, height: 18, type: 'number', fontSize: 16}),
        usedClass1: inputNode({id: 'hitDiceUsedClass1', x: 578, y: 222, width: 26, height: 18, type: 'number', fontSize: 16}),
        usedClass2: inputNode({id: 'hitDiceUsedClass2', x: 602, y: 222, width: 26, height: 18, type: 'number', fontSize: 16}),
        class2: inputNode({id: 'hitDiceClass2', x: 635, y: 210, width: 14, height: 20, type: 'number', fontSize: 12}),
    }

    const deathSaves = {
        failure1: inputNode({id: 'deathSaveFailure1', x: 678.27, y: 193.47, width: 11, height: 11, type: 'check'}),
        failure2: inputNode({id: 'deathSaveFailure2', x: 670.8, y: 211.2, width: 11, height: 11, type: 'check'}),
        failure3: inputNode({id: 'deathSaveFailure3', x: 678.27, y: 228.8, width: 11, height: 11, type: 'check'}),
        success1: inputNode({id: 'deathSaveSuccess1', x: 743.33, y: 193.47, width: 11, height: 11, type: 'check'}),
        success2: inputNode({id: 'deathSaveSuccess2', x: 750.93, y: 211.2, width: 11, height: 11, type: 'check'}),
        success3: inputNode({id: 'deathSaveSuccess3', x: 743.33, y: 228.8, width: 11, height: 11, type: 'check'}),
    }

    return {combat, hitDice, deathSaves}
}
