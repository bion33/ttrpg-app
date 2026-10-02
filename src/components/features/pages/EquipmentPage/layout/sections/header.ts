import type {EquipmentSheetFactory} from '@pages/EquipmentPage/layout/nodes.ts'
import {carryCapacity} from '@pages/EquipmentPage/logic/formulas/formulas.ts'

/**
 * Builds the header fields: character name, class/level, and identity line.
 */
export function buildHeader({inputNode, checkNode, computedInputNode}: EquipmentSheetFactory) {
    const strength = inputNode({id: 'strength', x: 360, y: 64, width: 146, height: 22, type: 'number', fontSize: 18, textAlign: 'left'})
    const enableCarryCapacityCalculation = checkNode({
        id: 'enableCarryCapacityCalculation',
        x: 609.34,
        y: 86.29,
        width: 7.25,
        height: 9,
        type: 'check',
        shape: 'star',
        defaultValue: true,
    })

    return {
        characterName: inputNode({
            id: 'characterName',
            x: 88,
            y: 82,
            width: 230,
            height: 28,
            type: 'text',
            fontSize: 24,
            textAlign: 'center'
        }),

        strength,
        carryCapacity: computedInputNode(
            {id: 'carryingCapacity', x: 510, y: 64, width: 122, height: 22, type: 'number', fontSize: 18},
            enableCarryCapacityCalculation.atom,
            (get) => {
                const strengthValue = get(strength.atom)
                return strengthValue === null ? null : carryCapacity(strengthValue)
            },
        ),
        enableCarryCapacityCalculation,
        carryWeight: inputNode({id: 'carryWeight', x: 639, y: 64, width: 116, height: 22, type: 'number', fontSize: 18}),

        encumbrance: inputNode({id: 'encumbrance', x: 360, y: 98, width: 272, height: 22, type: 'text', fontSize: 18}),
        storageWeight: inputNode({id: 'storageWeight', x: 639.1, y: 98, width: 116, height: 22, type: 'number', fontSize: 18}),
        enableWeightCalculation: checkNode({
            id: 'enableWeightCalculation',
            x: 773.54,
            y: 93.17,
            width: 7.25,
            height: 9,
            type: 'check',
            shape: 'star',
            defaultValue: true,
        }),
    }
}
